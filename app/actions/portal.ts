"use server"

import { db } from "@/lib/db"
import { activity, subscriber } from "@/lib/db/schema"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { notifySubscriptionCancelled } from "@/lib/merchant-notify"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function cancelSubscriberFromPortal(portalToken: string) {
  const [sub] = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.portalToken, portalToken))
    .limit(1)

  if (!sub || sub.status === "cancelled") return

  await db
    .update(subscriber)
    .set({ status: "cancelled", mrr: 0 })
    .where(eq(subscriber.id, sub.id))

  await db.insert(activity).values({
    userId: sub.userId,
    type: "subscription.cancelled",
    message: `${sub.name} cancelled ${sub.planName} via customer portal`,
  })

  await dispatchMerchantWebhook(sub.userId, "subscription.cancelled", {
    subscriber_id: sub.id,
    email: sub.email,
    plan_id: sub.planId,
    amount: 0,
  })

  try {
    await notifySubscriptionCancelled(sub.userId, {
      email: sub.email,
      name: sub.name,
      planName: sub.planName,
      portalToken: sub.portalToken,
    })
  } catch (e) {
    console.error("[portal] cancellation notifications failed:", e)
  }

  revalidatePath(`/portal/${portalToken}`)
}
