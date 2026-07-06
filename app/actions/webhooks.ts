"use server"

import { db } from "@/lib/db"
import { webhookDelivery } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
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

/**
 * Sends a REAL HTTP POST to the merchant's configured endpoint. The recorded
 * status code and response time come from the receiving server's actual
 * response; failures retry with backoff and every attempt is logged.
 */
export async function sendTestWebhook(): Promise<TestWebhookResult> {
  const userId = await getUserId()

  const result = await dispatchMerchantWebhook(
    userId,
    "test.ping",
    {
      message: "Subflow webhook test — this request was sent over the network to your endpoint.",
    },
    { bypassSubscriptionFilter: true },
  )

  revalidatePath("/dashboard/settings")

  if (!result.sent) {
    return { ok: false, error: result.reason }
  }

  const last = result.attempts[result.attempts.length - 1]
  return {
    ok: result.delivered,
    delivered: result.delivered,
    statusCode: last.statusCode,
    responseTimeMs: last.responseTimeMs,
    attempts: result.attempts.length,
    error: last.error ?? undefined,
  }
}
