import "server-only"

import { db } from "@/lib/db"
import { activity, plan, subscriber, transaction } from "@/lib/db/schema"
import { getAppUrl, monthlyMrrKobo, nextBillingDate } from "@/lib/billing"
import { verifyTransaction } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, eq } from "drizzle-orm"

export type ConfirmPaymentResult =
  | { status: "activated"; subscriberId: number }
  | { status: "already_active"; subscriberId: number }
  | { status: "not_found" }
  | { status: "not_paid"; reason: string }

/** Append ?ref=orderReference so the callback page can verify payment with Nomba. */
export function appendOrderReferenceToCallbackUrl(
  baseUrl: string,
  orderReference: string,
): string {
  const absolute = baseUrl.startsWith("http")
    ? baseUrl
    : `${getAppUrl()}${baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`}`
  const url = new URL(absolute)
  url.searchParams.set("ref", orderReference)
  return url.toString()
}

/**
 * Verify an initial checkout payment with Nomba's API and activate the subscriber.
 * Used by the Nomba webhook and by the hosted-checkout success callback (fallback
 * when the webhook is delayed or not configured).
 */
export async function confirmInitialPaymentByOrderReference(
  orderReference: string,
  opts?: { tokenKey?: string; nombaTransactionId?: string },
): Promise<ConfirmPaymentResult> {
  const [sub] = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.initOrderReference, orderReference))
    .limit(1)

  if (!sub) return { status: "not_found" }

  if (sub.status === "active" && sub.lastChargeResult === "successful") {
    return { status: "already_active", subscriberId: sub.id }
  }

  const verification = await verifyTransaction({ orderReference })
  if (!verification.found) {
    return { status: "not_paid", reason: verification.description }
  }
  if (verification.status !== "SUCCESS") {
    return { status: "not_paid", reason: `Nomba reports status "${verification.status}"` }
  }

  const nombaTransactionId = opts?.nombaTransactionId || verification.transactionId
  const tokenKey = opts?.tokenKey

  const [existingTx] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.subscriberId, sub.id), eq(transaction.status, "successful")))
    .limit(1)

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

  if (!existingTx) {
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

    try {
      await dispatchMerchantWebhook(sub.userId, "charge.success", {
        subscriber_id: sub.id,
        email: sub.email,
        plan_id: sub.planId,
        amount,
      })
    } catch (e) {
      console.error("[confirm-payment] merchant webhook dispatch failed:", e)
    }
  }

  return { status: "activated", subscriberId: sub.id }
}

/** Dashboard action: re-check Nomba for a pending subscriber's first payment. */
export async function confirmInitialPaymentBySubscriberId(
  subscriberId: number,
  userId: string,
): Promise<ConfirmPaymentResult> {
  const [sub] = await db
    .select()
    .from(subscriber)
    .where(and(eq(subscriber.id, subscriberId), eq(subscriber.userId, userId)))
    .limit(1)

  if (!sub) return { status: "not_found" }
  if (!sub.initOrderReference) {
    return { status: "not_paid", reason: "No checkout order reference on file for this subscriber." }
  }

  return confirmInitialPaymentByOrderReference(sub.initOrderReference)
}
