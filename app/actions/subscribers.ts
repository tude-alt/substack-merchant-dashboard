"use server"

import { db } from "@/lib/db"
import { subscriber, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, desc, eq } from "drizzle-orm"

export async function getSubscribers() {
  const userId = await getUserId()
  return db
    .select()
    .from(subscriber)
    .where(eq(subscriber.userId, userId))
    .orderBy(desc(subscriber.mrr))
}

export async function getSubscriberHistory(subscriberId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.subscriberId, subscriberId),
      ),
    )
    .orderBy(desc(transaction.createdAt))
}
