"use server"

import { db } from "@/lib/db"
import { transaction, subscriber, activity } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, desc, eq, gte, lte, count } from "drizzle-orm"
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
  return db
    .select()
    .from(transaction)
    .where(and(eq(transaction.userId, userId), eq(transaction.status, "failed")))
    .orderBy(desc(transaction.createdAt))
}

export async function retryCharge(transactionId: number) {
  const userId = await getUserId()
  const [tx] = await db
    .select()
    .from(transaction)
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId)),
    )
    .limit(1)
  if (!tx) return

  // Simulate a manual retry succeeding.
  await db
    .update(transaction)
    .set({
      status: "successful",
      failureReason: null,
      nextRetryDate: null,
      retryCount: tx.retryCount + 1,
    })
    .where(eq(transaction.id, transactionId))

  if (tx.subscriberId) {
    await db
      .update(subscriber)
      .set({ status: "active", lastChargeResult: "successful" })
      .where(
        and(
          eq(subscriber.id, tx.subscriberId),
          eq(subscriber.userId, userId),
        ),
      )
  }

  await db.insert(activity).values({
    userId,
    type: "charge.retried",
    message: `Manual retry succeeded for ${tx.customerName} — charge recovered`,
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/subscribers")
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

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/subscribers")
}
