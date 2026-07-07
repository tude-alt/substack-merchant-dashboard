"use server"

import crypto from "crypto"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { verifyNombaCredentials } from "@/lib/nomba"
import { regenerateWebhookSecret as rotateWebhookSecret } from "@/lib/merchant-secrets"
import { getMerchantUserEmail } from "@/lib/merchant-notify"
import { sendOnboardingCompleteEmail } from "@/lib/email"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function genApiKey(prefix: string) {
  // These keys now authenticate real API requests — use a CSPRNG.
  const bytes = crypto.randomBytes(18)
  const body = BigInt(`0x${bytes.toString("hex")}`).toString(36).slice(0, 24)
  return `${prefix}_${body}`
}

function genWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`
}

export async function getMerchant() {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(merchant)
    .where(eq(merchant.userId, userId))
    .limit(1)

  if (rows.length > 0) {
    if (!rows[0].webhookSecret?.trim()) {
      const secret = genWebhookSecret()
      await db
        .update(merchant)
        .set({ webhookSecret: secret })
        .where(eq(merchant.userId, userId))
      return { ...rows[0], webhookSecret: secret }
    }
    return rows[0]
  }

  // Create an empty merchant record on first access.
  const [created] = await db
    .insert(merchant)
    .values({
      userId,
      liveApiKey: genApiKey("sk_live"),
      testApiKey: genApiKey("sk_test"),
      webhookSecret: genWebhookSecret(),
      webhookEvents: "subscription.created,charge.success,charge.failed,charge.retried",
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

/**
 * Verify Nomba credentials with a real token issue call
 * (POST /v1/auth/token/issue). Marks the merchant connected only when Nomba
 * actually accepts the credentials; otherwise surfaces Nomba's real error.
 */
export async function connectNomba() {
  const userId = await getUserId()
  await getMerchant()

  try {
    const result = await verifyNombaCredentials()
    if (result.ok) {
      await db
        .update(merchant)
        .set({ nombaConnected: true })
        .where(eq(merchant.userId, userId))
      return { ok: true as const }
    }
    console.error("[nomba] credential verification failed:", result.error)
    return { ok: false as const, error: result.error }
  } catch (error) {
    console.error("[nomba] connection failed:", error)
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function completeOnboarding() {
  const userId = await getUserId()
  const m = await getMerchant()
  if (!m.onboardingComplete) {
    await db
      .update(merchant)
      .set({ onboardingComplete: true })
      .where(eq(merchant.userId, userId))

    const account = await getMerchantUserEmail(userId)
    if (account?.email) {
      try {
        await sendOnboardingCompleteEmail({
          to: account.email,
          name: m.businessName || account.name || "there",
        })
      } catch (e) {
        console.error("[merchant] onboarding complete email failed:", e)
      }
    }
  }
  revalidatePath("/dashboard")
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
  revalidatePath("/dashboard/settings")
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
  revalidatePath("/dashboard/settings")
}

export async function regenerateWebhookSecret() {
  const userId = await getUserId()
  await getMerchant()
  const secret = await rotateWebhookSecret(userId)
  revalidatePath("/dashboard/settings")
  return secret
}

export async function saveBranding(input: { logoUrl: string; brandColor: string }) {
  const userId = await getUserId()
  await getMerchant()
  await db
    .update(merchant)
    .set({
      logoUrl: input.logoUrl.trim(),
      brandColor: input.brandColor.trim() || "#4f46e5",
    })
    .where(eq(merchant.userId, userId))
  revalidatePath("/dashboard/settings")
  revalidatePath("/checkout")
}

export async function saveAlertSettings(input: {
  alertEmail: string
  slackWebhookUrl: string
}) {
  const userId = await getUserId()
  await getMerchant()
  await db
    .update(merchant)
    .set({
      alertEmail: input.alertEmail.trim(),
      slackWebhookUrl: input.slackWebhookUrl.trim(),
    })
    .where(eq(merchant.userId, userId))
  revalidatePath("/dashboard/settings")
}

export async function acknowledgeNombaWebhook() {
  const userId = await getUserId()
  await db
    .update(merchant)
    .set({ nombaWebhookAcknowledged: true })
    .where(eq(merchant.userId, userId))
  revalidatePath("/onboarding")
  revalidatePath("/dashboard/settings")
}
