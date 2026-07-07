"use server"

import { db } from "@/lib/db"
import { subscriber, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { chargeSubscriberViaNomba } from "@/lib/billing"
import {
  confirmInitialPaymentBySubscriberId,
  type ConfirmPaymentResult,
} from "@/lib/confirm-payment"
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

export type VerifyPaymentResult =
  | { ok: true; status: "activated" | "already_active"; subscriberId: number }
  | { ok: false; error: string }

function confirmResultToVerifyPayment(result: ConfirmPaymentResult): VerifyPaymentResult {
  switch (result.status) {
    case "activated":
      return { ok: true, status: "activated", subscriberId: result.subscriberId }
    case "already_active":
      return { ok: true, status: "already_active", subscriberId: result.subscriberId }
    case "not_found":
      return { ok: false, error: "Subscriber not found." }
    case "not_paid":
      return {
        ok: false,
        error: result.reason || "Nomba has not confirmed this payment yet.",
      }
  }
}

/** Re-check Nomba for a pending subscriber's first checkout payment. */
export async function verifySubscriberPayment(
  subscriberId: number,
): Promise<VerifyPaymentResult> {
  const userId = await getUserId()
  const result = await confirmInitialPaymentBySubscriberId(subscriberId, userId)
  const mapped = confirmResultToVerifyPayment(result)
  if (mapped.ok) {
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/transactions")
    revalidatePath("/dashboard/subscribers")
  }
  return mapped
}

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
