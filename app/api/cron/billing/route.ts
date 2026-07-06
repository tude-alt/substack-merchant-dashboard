import { db } from "@/lib/db"
import { subscriber, transaction } from "@/lib/db/schema"
import { chargeSubscriberViaNomba } from "@/lib/billing"
import { and, eq, isNotNull, lte } from "drizzle-orm"

/**
 * Scheduled billing runner (wired to Vercel Cron via vercel.json).
 *
 * 1. Charges active subscribers whose billingDate is due.
 * 2. Retries failed transactions whose real nextRetryDate (computed from the
 *    plan's retry_attempts / retry_every_days on a real failure) has arrived.
 *
 * Every charge is a real Nomba tokenized-card call; outcomes (including
 * failures) are persisted verbatim by chargeSubscriberViaNomba.
 */

export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results: Record<string, unknown>[] = []

  // Due recurring charges.
  const dueSubscribers = await db
    .select()
    .from(subscriber)
    .where(
      and(
        eq(subscriber.status, "active"),
        isNotNull(subscriber.nombaTokenKey),
        lte(subscriber.billingDate, now),
      ),
    )

  for (const sub of dueSubscribers) {
    try {
      const outcome = await chargeSubscriberViaNomba(sub.userId, sub.id)
      results.push({ kind: "recurring", subscriberId: sub.id, ...outcome })
    } catch (e) {
      results.push({
        kind: "recurring",
        subscriberId: sub.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // Due retries of real failures.
  const dueRetries = await db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.status, "failed"),
        isNotNull(transaction.nextRetryDate),
        lte(transaction.nextRetryDate, now),
      ),
    )

  for (const tx of dueRetries) {
    if (!tx.subscriberId) continue
    try {
      const outcome = await chargeSubscriberViaNomba(tx.userId, tx.subscriberId, {
        retryOfTransactionId: tx.id,
      })
      results.push({ kind: "retry", retriedTransactionId: tx.id, ...outcome })
    } catch (e) {
      results.push({
        kind: "retry",
        transactionId: tx.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return Response.json({
    ran_at: now.toISOString(),
    due_subscriptions: dueSubscribers.length,
    due_retries: dueRetries.length,
    results,
  })
}
