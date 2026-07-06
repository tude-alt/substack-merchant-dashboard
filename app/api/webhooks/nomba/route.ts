import { db } from "@/lib/db"
import { activity, plan, subscriber, transaction } from "@/lib/db/schema"
import { monthlyMrrKobo, nextBillingDate } from "@/lib/billing"
import { verifyNombaWebhookSignature } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, eq, or } from "drizzle-orm"

/**
 * Inbound webhook receiver for Nomba events (configure this URL on the Nomba
 * dashboard: Developer → Webhook Setup).
 *
 * Payload shape per developer.nomba.com:
 *   { event_type, requestId, data: { merchant, transaction, order?, tokenizedCardData?, customer? } }
 *
 * Signature: HMAC-SHA256 (base64) of the raw body using the signature key set
 * on the Nomba dashboard, sent in the `nomba-signature` header. Unsigned or
 * mis-signed requests are rejected — no trust without verification.
 */

export async function POST(request: Request) {
  const rawBody = await request.text()

  const signature =
    request.headers.get("nomba-signature") ?? request.headers.get("nomba-sig-value")
  const check = verifyNombaWebhookSignature(rawBody, signature)
  if (!check.valid) {
    console.error(`[nomba-webhook] rejected: ${check.reason}`)
    return Response.json({ error: check.reason }, { status: 401 })
  }

  let payload: {
    event_type?: string
    requestId?: string
    data?: {
      transaction?: Record<string, unknown>
      order?: Record<string, unknown>
      tokenizedCardData?: Record<string, unknown>
    }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const eventType = payload.event_type
  const data = payload.data
  if (!eventType || !data) {
    return Response.json({ error: "Missing event_type or data" }, { status: 400 })
  }

  console.log(`[nomba-webhook] received ${eventType} (requestId=${payload.requestId})`)

  switch (eventType) {
    case "payment_success":
      await handlePaymentSuccess(data)
      break
    case "payment_failed":
      await handlePaymentFailed(data)
      break
    default:
      console.log(`[nomba-webhook] ignoring unhandled event_type: ${eventType}`)
  }

  return Response.json({ ok: true, event_type: eventType })
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

async function handlePaymentSuccess(data: {
  transaction?: Record<string, unknown>
  order?: Record<string, unknown>
  tokenizedCardData?: Record<string, unknown>
}) {
  const orderReference = str(data.order?.orderReference)
  const nombaTransactionId = str(data.transaction?.transactionId)
  const tokenKey = str(data.tokenizedCardData?.tokenKey)

  // Case 1: initial tokenizing checkout for a pending subscriber.
  if (orderReference) {
    const [sub] = await db
      .select()
      .from(subscriber)
      .where(eq(subscriber.initOrderReference, orderReference))
      .limit(1)

    if (sub) {
      const [p] = sub.planId
        ? await db
            .select()
            .from(plan)
            .where(and(eq(plan.id, sub.planId), eq(plan.userId, sub.userId)))
            .limit(1)
        : [undefined]

      const interval = p?.interval ?? "monthly"
      const amount = p?.amount ?? 0

      await db
        .update(subscriber)
        .set({
          status: "active",
          lastChargeResult: "successful",
          mrr: monthlyMrrKobo(amount, interval),
          billingDate: nextBillingDate(new Date(), interval),
          ...(tokenKey && tokenKey !== "N/A" ? { nombaTokenKey: tokenKey } : {}),
        })
        .where(eq(subscriber.id, sub.id))

      await db.insert(transaction).values({
        userId: sub.userId,
        subscriberId: sub.id,
        customerName: sub.name,
        planName: sub.planName,
        amount,
        status: "successful",
        nombaRef: nombaTransactionId || orderReference,
      })

      await db.insert(activity).values({
        userId: sub.userId,
        type: "charge.success",
        message: `${sub.name} completed first payment for ${sub.planName} (${nombaTransactionId || orderReference})`,
      })

      if (!tokenKey || tokenKey === "N/A") {
        console.warn(
          `[nomba-webhook] payment_success for ${orderReference} carried no usable tokenKey; ` +
            `recurring charges will not be possible for subscriber ${sub.id} until one is captured.`,
        )
      }

      await dispatchMerchantWebhook(sub.userId, "charge.success", {
        subscriber_id: sub.id,
        customer_email: sub.email,
        plan_id: sub.planId,
        plan_name: sub.planName,
        amount_kobo: amount,
        nomba_reference: nombaTransactionId || orderReference,
        order_reference: orderReference,
        initial_payment: true,
        card_tokenized: Boolean(tokenKey && tokenKey !== "N/A"),
      })
      return
    }
  }

  // Case 2: confirmation for a recurring tokenized charge we recorded as pending.
  const refCandidates = [orderReference, nombaTransactionId].filter(Boolean)
  if (refCandidates.length > 0) {
    const [tx] = await db
      .select()
      .from(transaction)
      .where(or(...refCandidates.map((r) => eq(transaction.nombaRef, r))))
      .limit(1)

    if (tx && tx.status !== "successful") {
      await db
        .update(transaction)
        .set({
          status: "successful",
          failureReason: null,
          nextRetryDate: null,
          ...(nombaTransactionId ? { nombaRef: nombaTransactionId } : {}),
        })
        .where(eq(transaction.id, tx.id))

      if (tx.subscriberId) {
        const [sub] = await db
          .select()
          .from(subscriber)
          .where(eq(subscriber.id, tx.subscriberId))
          .limit(1)
        if (sub) {
          const [p] = sub.planId
            ? await db.select().from(plan).where(eq(plan.id, sub.planId)).limit(1)
            : [undefined]
          const interval = p?.interval ?? "monthly"
          await db
            .update(subscriber)
            .set({
              status: "active",
              lastChargeResult: "successful",
              mrr: monthlyMrrKobo(p?.amount ?? tx.amount, interval),
              billingDate: nextBillingDate(new Date(), interval),
            })
            .where(eq(subscriber.id, sub.id))
        }
      }

      await db.insert(activity).values({
        userId: tx.userId,
        type: "charge.success",
        message: `Charge confirmed by Nomba for ${tx.customerName} (${nombaTransactionId || tx.nombaRef})`,
      })

      await dispatchMerchantWebhook(tx.userId, "charge.success", {
        transaction_id: tx.id,
        subscriber_id: tx.subscriberId,
        plan_name: tx.planName,
        amount_kobo: tx.amount,
        nomba_reference: nombaTransactionId || tx.nombaRef,
      })
      return
    }
  }

  console.log(
    `[nomba-webhook] payment_success did not match any subscriber/transaction (orderReference=${orderReference}, transactionId=${nombaTransactionId})`,
  )
}

async function handlePaymentFailed(data: {
  transaction?: Record<string, unknown>
  order?: Record<string, unknown>
}) {
  const orderReference = str(data.order?.orderReference)
  const nombaTransactionId = str(data.transaction?.transactionId)
  const reason =
    str(data.transaction?.responseCodeMessage) ||
    str(data.transaction?.responseCode) ||
    "Payment failed (no reason supplied by Nomba)"

  const refCandidates = [orderReference, nombaTransactionId].filter(Boolean)
  if (refCandidates.length === 0) return

  const [tx] = await db
    .select()
    .from(transaction)
    .where(or(...refCandidates.map((r) => eq(transaction.nombaRef, r))))
    .limit(1)
  if (!tx || tx.status === "failed") {
    console.log(
      `[nomba-webhook] payment_failed did not match a pending transaction (orderReference=${orderReference})`,
    )
    return
  }

  // Schedule a retry from the plan's real retry configuration.
  let nextRetry: Date | null = null
  let retriesRemaining = false
  let suspend = false
  if (tx.subscriberId) {
    const [sub] = await db
      .select()
      .from(subscriber)
      .where(eq(subscriber.id, tx.subscriberId))
      .limit(1)
    const [p] = sub?.planId
      ? await db.select().from(plan).where(eq(plan.id, sub.planId)).limit(1)
      : [undefined]
    if (p) {
      retriesRemaining = tx.retryCount < p.retryAttempts
      nextRetry = retriesRemaining
        ? new Date(Date.now() + p.retryIntervalDays * 24 * 60 * 60 * 1000)
        : null
      suspend = !retriesRemaining
    }
    if (sub) {
      await db
        .update(subscriber)
        .set({
          lastChargeResult: "failed",
          ...(suspend ? { status: "suspended", mrr: 0 } : {}),
        })
        .where(eq(subscriber.id, sub.id))
    }
  }

  await db
    .update(transaction)
    .set({ status: "failed", failureReason: reason, nextRetryDate: nextRetry })
    .where(eq(transaction.id, tx.id))

  await db.insert(activity).values({
    userId: tx.userId,
    type: suspend ? "access.suspended" : "charge.failed",
    message: suspend
      ? `Charge failed for ${tx.customerName}: ${reason} — retries exhausted, access suspended`
      : `Charge failed for ${tx.customerName}: ${reason}${nextRetry ? ` — retry scheduled for ${nextRetry.toDateString()}` : ""}`,
  })

  await dispatchMerchantWebhook(tx.userId, "charge.failed", {
    transaction_id: tx.id,
    subscriber_id: tx.subscriberId,
    plan_name: tx.planName,
    amount_kobo: tx.amount,
    failure_reason: reason,
    nomba_reference: nombaTransactionId || tx.nombaRef,
    next_retry_date: nextRetry?.toISOString() ?? null,
  })
}
