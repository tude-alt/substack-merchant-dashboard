import "server-only"

import crypto from "crypto"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export function genWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`
}

/** Ensure the merchant row has a webhook signing secret (generated once per merchant). */
export async function ensureWebhookSecret(userId: string): Promise<string> {
  const [m] = await db.select().from(merchant).where(eq(merchant.userId, userId)).limit(1)
  if (!m) throw new Error("Merchant not found.")

  if (m.webhookSecret?.trim()) return m.webhookSecret

  const secret = genWebhookSecret()
  await db.update(merchant).set({ webhookSecret: secret }).where(eq(merchant.userId, userId))
  return secret
}

export async function regenerateWebhookSecret(userId: string): Promise<string> {
  const secret = genWebhookSecret()
  await db.update(merchant).set({ webhookSecret: secret }).where(eq(merchant.userId, userId))
  return secret
}
