"use server"

import { db } from "@/lib/db"
import { webhookDelivery } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { dispatchMerchantWebhook, formatWebhookTestResult } from "@/lib/webhook-dispatch"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getWebhookDeliveries() {
  const userId = await getUserId()
  return db
    .select()
    .from(webhookDelivery)
    .where(eq(webhookDelivery.userId, userId))
    .orderBy(desc(webhookDelivery.createdAt))
    .limit(20)
}

export type TestWebhookResult =
  | { ok: false; error: string }
  | {
      ok: boolean
      delivered: boolean
      statusCode: number
      responseTimeMs: number
      attempts: number
      error?: string
    }

export async function sendTestWebhook(): Promise<TestWebhookResult> {
  const userId = await getUserId()

  const result = await dispatchMerchantWebhook(
    userId,
    "test.ping",
    {
      subscriber_id: null,
      email: "",
      plan_id: null,
      amount: 0,
      message: "Subflow webhook test — this request was sent over the network to your endpoint.",
    },
    { bypassSubscriptionFilter: true },
  )

  revalidatePath("/dashboard/settings")

  const formatted = formatWebhookTestResult(result)
  if (!formatted.ok && "error" in formatted) {
    return { ok: false, error: formatted.error }
  }

  return {
    ok: formatted.delivered,
    delivered: formatted.delivered,
    statusCode: formatted.status_code,
    responseTimeMs: formatted.response_time_ms,
    attempts: formatted.attempts,
    error: formatted.error,
  }
}

export async function replayWebhookDelivery(deliveryId: number) {
  const userId = await getUserId()
  const [row] = await db
    .select()
    .from(webhookDelivery)
    .where(eq(webhookDelivery.id, deliveryId))
    .limit(1)

  if (!row || row.userId !== userId) {
    return { ok: false as const, error: "Delivery not found." }
  }

  const result = await dispatchMerchantWebhook(
    userId,
    row.event as "test.ping",
    {
      subscriber_id: null,
      email: "",
      plan_id: null,
      amount: 0,
      message: `Replay of delivery #${row.id}`,
    },
    { bypassSubscriptionFilter: true },
  )

  revalidatePath("/dashboard/settings")
  const formatted = formatWebhookTestResult(result)
  if (!formatted.ok && "error" in formatted) {
    return { ok: false as const, error: formatted.error }
  }
  return {
    ok: true as const,
    delivered: formatted.delivered,
    statusCode: formatted.status_code,
  }
}
