"use server"

import { db } from "@/lib/db"
import { transaction, subscriber, activity } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { chargeSubscriberViaNomba } from "@/lib/billing"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, desc, eq, gte, lte, count, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

const PAGE_SIZE = 12

export async function getTransactions(opts: {
  status?: string
  from?: string
  to?: string
  page?: number
}) {
  const userId = await getUserId()
  const page = Math.max(1, opts.page ?? 1)

  const filters = [eq(transaction.userId, userId)]
  if (opts.status && opts.status !== "all") {
    filters.push(eq(transaction.status, opts.status))
  }
  if (opts.from) filters.push(gte(transaction.createdAt, new Date(opts.from)))
  if (opts.to) {
    const to = new Date(opts.to)
    to.setHours(23, 59, 59, 999)
    filters.push(lte(transaction.createdAt, to))
  }
  const where = and(...filters)

  const [{ total }] = await db
    .select({ total: count() })
    .from(transaction)
    .where(where)

  const rows = await db
    .select()
    .from(transaction)
    .where(where)
    .orderBy(desc(transaction.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  return {
    rows,
    total: Number(total),
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)),
  }
}

export async function getFailedPayments() {
  const userId = await getUserId()
  // Failed charges that have not since been superseded by a newer attempt for
  // the same subscriber (history rows stay failed; this is the action list).
  return db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "failed"),
        sql`NOT EXISTS (
          SELECT 1 FROM "transaction" t2
          WHERE t2."subscriberId" = ${transaction.subscriberId}
            AND t2."userId" = ${userId}
            AND t2."id" > ${transaction.id}
        )`,
      ),
    )
    .orderBy(desc(transaction.createdAt))
}

export type RetryChargeResult =
  | { ok: true; nombaRef: string; status: string }
  | { ok: false; error: string }

/**
 * Manual retry = a real Nomba tokenized-card charge attempt. The result shown
 * in the UI is whatever Nomba actually returned; failures stay failures.
 */
export async function retryCharge(transactionId: number): Promise<RetryChargeResult> {
  const userId = await getUserId()
  const [tx] = await db
    .select()
    .from(transaction)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId)),
    )
    .limit(1)
  if (!tx) return { ok: false, error: "Transaction not found." }
  if (!tx.subscriberId) {
    return { ok: false, error: "Transaction has no linked subscriber to charge." }
  }

  try {
    const outcome = await chargeSubscriberViaNomba(userId, tx.subscriberId, {
      retryOfTransactionId: tx.id,
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/transactions")
    revalidatePath("/dashboard/subscribers")

    if (outcome.ok) {
      return { ok: true, nombaRef: outcome.nombaRef, status: outcome.status }
    }
    return { ok: false, error: outcome.failureReason }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function cancelCharge(transactionId: number) {
  const userId = await getUserId()
  const [tx] = await db
    .select()
    .from(transaction)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId)),
    )
    .limit(1)
  if (!tx) return

  await db
    .update(transaction)
    .set({ nextRetryDate: null })
    .where(eq(transaction.id, transactionId))

  if (tx.subscriberId) {
    await db
      .update(subscriber)
      .set({ status: "cancelled", mrr: 0 })
      .where(
        and(
          eq(subscriber.id, tx.subscriberId),
          eq(subscriber.userId, userId),
        ),
      )
  }

  await db.insert(activity).values({
    userId,
    type: "subscription.cancelled",
    message: `Subscription cancelled for ${tx.customerName} after failed charge`,
  })

  await dispatchMerchantWebhook(userId, "subscription.cancelled", {
    subscriber_id: tx.subscriberId,
    email: "",
    plan_id: null,
    amount: tx.amount,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/transactions")
  revalidatePath("/dashboard/subscribers")
}
