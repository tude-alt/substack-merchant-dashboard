"use server"

import { db } from "@/lib/db"
import { subscriber, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { chargeSubscriberViaNomba } from "@/lib/billing"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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

export type ChargeNowResult =
  | { ok: true; nombaRef: string; status: string }
  | { ok: false; error: string }

/**
 * Trigger a real Nomba tokenized-card charge for this subscriber right now.
 * The returned status/reference/error is exactly what Nomba produced.
 */
export async function chargeSubscriberNow(
  subscriberId: number,
): Promise<ChargeNowResult> {
  const userId = await getUserId()
  try {
    const outcome = await chargeSubscriberViaNomba(userId, subscriberId)
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
