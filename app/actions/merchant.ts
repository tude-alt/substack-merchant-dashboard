"use server"

import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
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

/**
 * Get the active Nomba credentials (test or live) from environment variables.
 * Prefer live if available; fall back to test.
 * This is not a server action, just a helper function.
 */
function getNombaCredentials() {
  // Check for live credentials first
  if (
    process.env.NOMBA_CLIENT_ID &&
    process.env.NOMBA_PRIVATE_KEY &&
    process.env.NOMBA_ACCOUNT_ID
  ) {
    return {
      clientId: process.env.NOMBA_CLIENT_ID,
      privateKey: process.env.NOMBA_PRIVATE_KEY,
      accountId: process.env.NOMBA_ACCOUNT_ID,
      mode: "live" as const,
    }
  }

  // Fall back to test credentials
  if (
    process.env.NOMBA_TEST_CLIENT_ID &&
    process.env.NOMBA_TEST_PRIVATE_KEY &&
    process.env.NOMBA_TEST_ACCOUNT_ID
  ) {
    return {
      clientId: process.env.NOMBA_TEST_CLIENT_ID,
      privateKey: process.env.NOMBA_TEST_PRIVATE_KEY,
      accountId: process.env.NOMBA_TEST_ACCOUNT_ID,
      mode: "test" as const,
    }
  }

  return null
}

export async function connectNomba() {
  const userId = await getUserId()
  await getMerchant()

  const nomba = getNombaCredentials()
  if (!nomba) {
    return { ok: false, error: "Nomba credentials not configured." }
  }

  // Verify credentials by calling Nomba's API with proper authentication headers.
  // Using a simple account info endpoint to validate the credentials.
  try {
    const response = await fetch("https://api.nomba.com/v1/accounts", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${nomba.privateKey}`,
        "X-Account-Id": nomba.accountId,
        "Content-Type": "application/json",
      },
    })

    const ok = response.ok
    if (ok) {
      await db
        .update(merchant)
        .set({ nombaConnected: true })
        .where(eq(merchant.userId, userId))
    } else {
      console.error("[v0] Nomba API error:", response.status, await response.text())
    }
    return { ok, error: !ok ? `API returned ${response.status}` : undefined }
  } catch (error) {
    console.error("[v0] Nomba connection failed:", error)
    return { ok: false, error: "Connection failed. Verify your credentials are set in environment variables." }
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
