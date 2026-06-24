"use server"

import { db } from "@/lib/db"
import { webhookDelivery, merchant } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
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

export async function sendTestWebhook() {
  const userId = await getUserId()
  const [m] = await db
    .select()
    .from(merchant)
    .where(eq(merchant.userId, userId))
    .limit(1)

  const endpoint = m?.webhookUrl?.trim()
  if (!endpoint) {
    return { ok: false as const, error: "Add a webhook endpoint URL first." }
  }

  // Simulated delivery: most succeed, with a realistic response time.
  const responseTimeMs = 80 + Math.floor(Math.random() * 320)
  const statusCode = Math.random() > 0.15 ? 200 : 500

  await db.insert(webhookDelivery).values({
    userId,
    endpoint,
    event: "charge.success",
    statusCode,
    responseTimeMs,
  })

  revalidatePath("/settings")
  return { ok: statusCode === 200, statusCode, responseTimeMs }
}
