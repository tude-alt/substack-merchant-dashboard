import { db } from "@/lib/db"
import { activity, plan, subscriber, transaction } from "@/lib/db/schema"
import { confirmInitialPaymentByOrderReference } from "@/lib/confirm-payment"
import { monthlyMrrKobo, nextBillingDate } from "@/lib/billing"
import { verifyNombaWebhookSignature, verifyTransaction } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, eq, or } from "drizzle-orm"

/**
 * Inbound webhook receiver for Nomba events (register this URL with Nomba).
 *
 * Payload shape per developer.nomba.com:
 *   { event_type, requestId, data: { merchant, transaction, order?, tokenizedCardData?, customer? } }
 *
 * Trust model (per Nomba docs: "always verify the transaction with Nomba
 * before giving value, even if you received a webhook"):
 *   1. If NOMBA_WEBHOOK_SIGNATURE_KEY is set, the HMAC-SHA256 signature in the
 *      `nomba-signature` header must match or the request is rejected.
 *   2. Regardless of signature, every payment event is confirmed with a real
 *      lookup against Nomba's transaction API before any state changes. A
 *      forged POST cannot activate a subscription because Nomba's API will not
 *      corroborate it.
 */

export async function POST(request: Request) {
  const rawBody = await request.text()

  const signatureKey = process.env.NOMBA_WEBHOOK_SIGNATURE_KEY?.trim()
  if (signatureKey) {
    const signature =
      request.headers.get("nomba-signature") ?? request.headers.get("nomba-sig-value")
    const check = verifyNombaWebhookSignature(rawBody, signature, signatureKey)
    if (!check.valid) {
      console.error(`[nomba-webhook] rejected: ${check.reason}`)
      return Response.json({ error: check.reason }, { status: 401 })
    }
  } else {
    console.warn(
      "[nomba-webhook] NOMBA_WEBHOOK_SIGNATURE_KEY not set — relying on Nomba API lookup verification for this event.",
    )
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
    case "payment_success": {
      const verification = await verifyPaymentEvent(data)
      if (!verification.confirmed) {
        console.error(
          `[nomba-webhook] payment_success NOT corroborated by Nomba API (${verification.reason}) — ignoring event.`,
        )
        return Response.json(
          { error: `Event not corroborated by Nomba transaction API: ${verification.reason}` },
          { status: 422 },
        )
      }
      await handlePaymentSuccess(data, verification.transactionId)
      break
    }
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

/**
 * Confirm a payment_success event with a real lookup on Nomba's transaction
 * API. Only a Nomba-confirmed SUCCESS may change state.
 */
async function verifyPaymentEvent(data: {
  transaction?: Record<string, unknown>
  order?: Record<string, unknown>
}): Promise<
  { confirmed: true; transactionId: string } | { confirmed: false; reason: string }
> {
  const orderReference = str(data.order?.orderReference)
  const transactionRef = str(data.transaction?.transactionId)
  if (!orderReference && !transactionRef) {
    return { confirmed: false, reason: "event carries no orderReference or transactionId" }
  }

  const result = await verifyTransaction(
    orderReference ? { orderReference } : { transactionRef },
  )
  if (!result.found) {
    return {
      confirmed: false,
      reason: `Nomba lookup found no transaction (${result.code}: ${result.description})`,
    }
  }
  if (result.status !== "SUCCESS") {
    return { confirmed: false, reason: `Nomba reports status "${result.status}", not SUCCESS` }
  }
  return { confirmed: true, transactionId: result.transactionId }
}

async function handlePaymentSuccess(
  data: {
    transaction?: Record<string, unknown>
    order?: Record<string, unknown>
    tokenizedCardData?: Record<string, unknown>
  },
  verifiedTransactionId: string,
) {
  const orderReference = str(data.order?.orderReference)
  const nombaTransactionId = str(data.transaction?.transactionId) || verifiedTransactionId
  const tokenKey = str(data.tokenizedCardData?.tokenKey)

  if (orderReference) {
    const result = await confirmInitialPaymentByOrderReference(orderReference, {
      tokenKey: tokenKey || undefined,
      nombaTransactionId,
    })
    if (result.status === "activated" || result.status === "already_active") {
      if (!tokenKey || tokenKey === "N/A") {
        console.warn(
          `[nomba-webhook] payment_success for ${orderReference} carried no usable tokenKey; ` +
            `recurring charges may not be possible until a card is tokenized.`,
        )
      }
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
      let subForWebhook: (typeof subscriber.$inferSelect) | undefined
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
        subForWebhook = sub
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
        subscriber_id: tx.subscriberId,
        email: subForWebhook?.email ?? "",
        plan_id: subForWebhook?.planId ?? null,
        amount: tx.amount,
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

  // Corroborate with Nomba's API: never mark a charge failed that Nomba's own
  // records say succeeded (guards against forged/stale failure events).
  try {
    const lookup = await verifyTransaction(
      orderReference ? { orderReference } : { transactionRef: nombaTransactionId },
    )
    if (lookup.found && lookup.status === "SUCCESS") {
      console.warn(
        `[nomba-webhook] payment_failed contradicted by Nomba API (status SUCCESS) — ignoring event.`,
      )
      return
    }
  } catch (e) {
    console.error("[nomba-webhook] failure-event verification lookup errored:", e)
  }

  // Schedule a retry from the plan's real retry configuration.
  let nextRetry: Date | null = null
  let retriesRemaining = false
  let suspend = false
  let subForWebhook: (typeof subscriber.$inferSelect) | undefined
  if (tx.subscriberId) {
    const [sub] = await db
      .select()
      .from(subscriber)
      .where(eq(subscriber.id, tx.subscriberId))
      .limit(1)
    subForWebhook = sub
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
    subscriber_id: tx.subscriberId,
    email: subForWebhook?.email ?? "",
    plan_id: subForWebhook?.planId ?? null,
    amount: tx.amount,
    attempt: tx.retryCount + 1,
    final_attempt: suspend,
  })
}
