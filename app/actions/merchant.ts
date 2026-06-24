"use server"

import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { seedMerchantData } from "@/lib/seed"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function genApiKey(prefix: string) {
  const body = Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("")
  return `${prefix}_${body}`
}

export async function getMerchant() {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(merchant)
    .where(eq(merchant.userId, userId))
    .limit(1)

  if (rows.length > 0) return rows[0]

  // Create an empty merchant record on first access.
  const [created] = await db
    .insert(merchant)
    .values({
      userId,
      liveApiKey: genApiKey("sk_live"),
      testApiKey: genApiKey("sk_test"),
      webhookEvents: "subscription.created,charge.success,charge.failed",
    })
    .returning()
  return created
}

export async function saveBusinessInfo(input: {
  businessName: string
  category: string
}) {
  const userId = await getUserId()
  await getMerchant()
  await db
    .update(merchant)
    .set({ businessName: input.businessName, category: input.category })
    .where(eq(merchant.userId, userId))
  revalidatePath("/onboarding")
}

export async function connectNomba(apiKey: string) {
  const userId = await getUserId()
  await getMerchant()
  // Simulated connection test: keys starting with "nomba_" succeed.
  const ok = apiKey.trim().toLowerCase().startsWith("nomba_") && apiKey.length >= 12
  if (ok) {
    await db
      .update(merchant)
      .set({ nombaApiKey: apiKey, nombaConnected: true })
      .where(eq(merchant.userId, userId))
  }
  return { ok }
}

export async function completeOnboarding() {
  const userId = await getUserId()
  const m = await getMerchant()
  if (!m.onboardingComplete) {
    await db
      .update(merchant)
      .set({ onboardingComplete: true })
      .where(eq(merchant.userId, userId))
    // Seed demo data so the dashboard is populated.
    await seedMerchantData(userId)
  }
  revalidatePath("/")
}

export async function regenerateApiKey(which: "live" | "test") {
  const userId = await getUserId()
  await getMerchant()
  const key =
    which === "live" ? genApiKey("sk_live") : genApiKey("sk_test")
  await db
    .update(merchant)
    .set(which === "live" ? { liveApiKey: key } : { testApiKey: key })
    .where(eq(merchant.userId, userId))
  revalidatePath("/settings")
  return key
}

export async function saveWebhookConfig(input: {
  webhookUrl: string
  events: string[]
}) {
  const userId = await getUserId()
  await getMerchant()
  await db
    .update(merchant)
    .set({ webhookUrl: input.webhookUrl, webhookEvents: input.events.join(",") })
    .where(eq(merchant.userId, userId))
  revalidatePath("/settings")
}
