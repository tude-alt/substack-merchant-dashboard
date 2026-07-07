"use server"

import { db } from "@/lib/db"
import { activity, subscriber, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { chargeSubscriberViaNomba } from "@/lib/billing"
import {
  confirmInitialPaymentBySubscriberId,
  type ConfirmPaymentResult,
} from "@/lib/confirm-payment"
import { portalUrlForToken } from "@/lib/email"
import { generatePortalToken } from "@/lib/portal"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { notifySubscriptionCancelled, notifySubscriptionPaused } from "@/lib/merchant-notify"
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

function revalidateSubscriberPaths() {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/transactions")
  revalidatePath("/dashboard/subscribers")
}

async function getOwnedSubscriber(subscriberId: number, userId: string) {
  const [sub] = await db
    .select()
    .from(subscriber)
    .where(and(eq(subscriber.id, subscriberId), eq(subscriber.userId, userId)))
    .limit(1)
  return sub ?? null
}

export async function cancelSubscriber(subscriberId: number) {
  const userId = await getUserId()
  const sub = await getOwnedSubscriber(subscriberId, userId)
  if (!sub) return { ok: false as const, error: "Subscriber not found." }

  await db
    .update(subscriber)
    .set({ status: "cancelled", mrr: 0 })
    .where(eq(subscriber.id, sub.id))

  await db.insert(activity).values({
    userId,
    type: "subscription.cancelled",
    message: `${sub.name} cancelled ${sub.planName}`,
  })

  await dispatchMerchantWebhook(userId, "subscription.cancelled", {
    subscriber_id: sub.id,
    email: sub.email,
    plan_id: sub.planId,
    amount: 0,
  })

  try {
    await notifySubscriptionCancelled(userId, {
      email: sub.email,
      name: sub.name,
      planName: sub.planName,
      portalToken: sub.portalToken,
    })
  } catch (e) {
    console.error("[subscribers] cancellation notifications failed:", e)
  }

  revalidateSubscriberPaths()
  return { ok: true as const }
}

export async function pauseSubscriber(subscriberId: number) {
  const userId = await getUserId()
  const sub = await getOwnedSubscriber(subscriberId, userId)
  if (!sub) return { ok: false as const, error: "Subscriber not found." }

  await db
    .update(subscriber)
    .set({ status: "suspended", mrr: 0 })
    .where(eq(subscriber.id, sub.id))

  await db.insert(activity).values({
    userId,
    type: "access.suspended",
    message: `${sub.name} paused on ${sub.planName}`,
  })

  try {
    await notifySubscriptionPaused(userId, {
      email: sub.email,
      name: sub.name,
      planName: sub.planName,
      portalToken: sub.portalToken,
    })
  } catch (e) {
    console.error("[subscribers] pause notifications failed:", e)
  }

  revalidateSubscriberPaths()
  return { ok: true as const }
}

export async function getCheckoutLinkForSubscriber(subscriberId: number) {
  const userId = await getUserId()
  const sub = await getOwnedSubscriber(subscriberId, userId)
  if (!sub) return { ok: false as const, error: "Subscriber not found." }
  if (!sub.checkoutLink) {
    return { ok: false as const, error: "No checkout link on file for this subscriber." }
  }
  return { ok: true as const, url: sub.checkoutLink }
}

export async function getPortalLinkForSubscriber(subscriberId: number) {
  const userId = await getUserId()
  const sub = await getOwnedSubscriber(subscriberId, userId)
  if (!sub) return { ok: false as const, error: "Subscriber not found." }

  let token = sub.portalToken
  if (!token) {
    token = generatePortalToken()
    await db.update(subscriber).set({ portalToken: token }).where(eq(subscriber.id, sub.id))
  }

  return { ok: true as const, url: portalUrlForToken(token) }
}
