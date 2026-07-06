import "server-only"

import crypto from "crypto"
import { db } from "@/lib/db"
import { activity, plan, subscriber, transaction } from "@/lib/db/schema"
import { chargeTokenizedCard, verifyTransaction } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, eq } from "drizzle-orm"

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  )
}

export function monthlyMrrKobo(amountKobo: number, interval: string): number {
  if (interval === "weekly") return Math.round((amountKobo * 52) / 12)
  if (interval === "quarterly") return Math.round(amountKobo / 3)
  if (interval === "annual") return Math.round(amountKobo / 12)
  return amountKobo
}

export function nextBillingDate(from: Date, interval: string): Date {
  const d = new Date(from)
  if (interval === "weekly") d.setDate(d.getDate() + 7)
  else if (interval === "quarterly") d.setMonth(d.getMonth() + 3)
  else if (interval === "annual") d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export type ChargeOutcome =
  | {
      ok: true
      transactionId: number
      nombaRef: string
      status: "successful" | "pending"
      verifiedStatus: string | null
    }
  | {
      ok: false
      transactionId: number
      nombaRef: string
      failureReason: string
      retryScheduled: boolean
      nextRetryDate: Date | null
    }

/**
 * Charge a subscriber's tokenized card via Nomba, record the REAL outcome as a
 * transaction row, update subscriber state, schedule retries from the plan's
 * actual retry settings, and dispatch real merchant webhooks.
 *
 * Throws (without creating any transaction row) when preconditions make a real
 * charge attempt impossible — e.g. no tokenized card yet, or Nomba env vars
 * missing. There is no mock path.
 */
export async function chargeSubscriberViaNomba(
  userId: string,
  subscriberId: number,
  opts: { retryOfTransactionId?: number } = {},
): Promise<ChargeOutcome> {
  const [sub] = await db
    .select()
    .from(subscriber)
    .where(and(eq(subscriber.id, subscriberId), eq(subscriber.userId, userId)))
    .limit(1)
  if (!sub) throw new Error(`Subscriber ${subscriberId} not found for this merchant.`)

  if (!sub.nombaTokenKey) {
    throw new Error(
      `Subscriber "${sub.name}" has no tokenized card on file. ` +
        `They must first complete the initial checkout payment (Nomba sends the card token ` +
        `in the payment_success webhook). No charge attempt was made.`,
    )
  }
  if (!sub.planId) throw new Error(`Subscriber "${sub.name}" has no plan assigned.`)

  const [p] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, sub.planId), eq(plan.userId, userId)))
    .limit(1)
  if (!p) throw new Error(`Plan ${sub.planId} not found for this merchant.`)

  let priorRetryCount = 0
  if (opts.retryOfTransactionId) {
    const [prior] = await db
      .select()
      .from(transaction)
      .where(
        and(eq(transaction.id, opts.retryOfTransactionId), eq(transaction.userId, userId)),
      )
      .limit(1)
    if (!prior) throw new Error(`Transaction ${opts.retryOfTransactionId} not found.`)
    priorRetryCount = prior.retryCount
    // The retry attempt supersedes the prior row's schedule; the prior row keeps
    // its real "failed" status as history.
    await db
      .update(transaction)
      .set({ nextRetryDate: null })
      .where(eq(transaction.id, prior.id))
  }

  const orderReference = `SUBFLOW-REC-${sub.id}-${crypto.randomUUID()}`

  // Real network call to Nomba. Config errors throw loudly before any row is written.
  const result = await chargeTokenizedCard({
    tokenKey: sub.nombaTokenKey,
    amountKobo: p.amount,
    currency: p.currency,
    customerEmail: sub.email,
    customerId: String(sub.id),
    orderReference,
    callbackUrl: `${getAppUrl()}/dashboard/transactions`,
  })

  if (result.ok) {
    // Nomba docs: always verify before giving value. If verification cannot yet
    // confirm SUCCESS, we record "pending" and let the payment_success webhook
    // finalize it — never assume success.
    let verifiedStatus: string | null = null
    let nombaRef = orderReference
    try {
      const verification = await verifyTransaction({ orderReference })
      if (verification.found) {
        verifiedStatus = verification.status
        nombaRef = verification.transactionId
      }
    } catch (e) {
      console.error("[billing] verification call failed:", e)
    }

    const status = verifiedStatus === "SUCCESS" ? "successful" : "pending"

    const [tx] = await db
      .insert(transaction)
      .values({
        userId,
        subscriberId: sub.id,
        customerName: sub.name,
        planName: p.name,
        amount: p.amount,
        status,
        nombaRef,
        retryCount: opts.retryOfTransactionId ? priorRetryCount + 1 : 0,
      })
      .returning()

    if (status === "successful") {
      await db
        .update(subscriber)
        .set({
          status: "active",
          lastChargeResult: "successful",
          mrr: monthlyMrrKobo(p.amount, p.interval),
          billingDate: nextBillingDate(new Date(), p.interval),
        })
        .where(eq(subscriber.id, sub.id))

      await db.insert(activity).values({
        userId,
        type: opts.retryOfTransactionId ? "charge.retried" : "charge.success",
        message: opts.retryOfTransactionId
          ? `Retry charge succeeded for ${sub.name} (${nombaRef})`
          : `Charged ${sub.name} for ${p.name} (${nombaRef})`,
      })

      await dispatchMerchantWebhook(userId, opts.retryOfTransactionId ? "charge.retried" : "charge.success", {
        subscriber_id: sub.id,
        email: sub.email,
        plan_id: p.id,
        amount: p.amount,
        attempt: opts.retryOfTransactionId ? priorRetryCount + 1 : undefined,
      })
    } else {
      await db
        .update(subscriber)
        .set({ lastChargeResult: "pending" })
        .where(eq(subscriber.id, sub.id))
      await db.insert(activity).values({
        userId,
        type: "charge.pending",
        message: `Charge for ${sub.name} accepted by Nomba, awaiting confirmation (${orderReference})`,
      })
    }

    return { ok: true, transactionId: tx.id, nombaRef, status, verifiedStatus }
  }

  // Real failure from Nomba — persist it verbatim and schedule a retry from the
  // plan's actual retry configuration.
  const attemptNumber = opts.retryOfTransactionId ? priorRetryCount + 1 : 0
  const retriesRemaining = attemptNumber < p.retryAttempts
  const nextRetry = retriesRemaining
    ? new Date(Date.now() + p.retryIntervalDays * 24 * 60 * 60 * 1000)
    : null
  const failureReason = `Nomba ${result.httpStatus} [${result.code}]: ${result.description}`

  const [tx] = await db
    .insert(transaction)
    .values({
      userId,
      subscriberId: sub.id,
      customerName: sub.name,
      planName: p.name,
      amount: p.amount,
      status: "failed",
      nombaRef: orderReference,
      failureReason,
      retryCount: attemptNumber,
      nextRetryDate: nextRetry,
    })
    .returning()

  await db
    .update(subscriber)
    .set({
      lastChargeResult: "failed",
      // Suspend access only after the plan's real retry budget is exhausted.
      ...(retriesRemaining ? {} : { status: "suspended", mrr: 0 }),
    })
    .where(eq(subscriber.id, sub.id))

  await db.insert(activity).values({
    userId,
    type: retriesRemaining ? "charge.failed" : "access.suspended",
    message: retriesRemaining
      ? `Charge failed for ${sub.name}: ${result.description} — retry ${attemptNumber + 1}/${p.retryAttempts} scheduled for ${nextRetry!.toDateString()}`
      : `Charge failed for ${sub.name}: ${result.description} — retries exhausted (${p.retryAttempts}), access suspended`,
  })

  await dispatchMerchantWebhook(userId, "charge.failed", {
    subscriber_id: sub.id,
    email: sub.email,
    plan_id: p.id,
    amount: p.amount,
    attempt: attemptNumber + 1,
    final_attempt: !retriesRemaining,
  })

  return {
    ok: false,
    transactionId: tx.id,
    nombaRef: orderReference,
    failureReason,
    retryScheduled: retriesRemaining,
    nextRetryDate: nextRetry,
  }
}
