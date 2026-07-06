import crypto from "crypto"
import { db } from "@/lib/db"
import { merchant, planMetricSnapshot } from "@/lib/db/schema"
import { getAppUrl } from "@/lib/billing"
import { MERCHANT_CATEGORIES } from "@/lib/merchant-categories"
import { createPlanForUser, formatPlanForApi, PlanValidationError } from "@/lib/plans"
import { dispatchMerchantWebhook, formatWebhookTestResult } from "@/lib/webhook-dispatch"
import { eq } from "drizzle-orm"

function buildHostedCheckoutUrl(planId: number): string {
  return `${getAppUrl()}/checkout/${planId}`
}

export type PricingModel = "flat_monthly" | "tiered" | "usage_based"
export type BillingInterval = "monthly" | "weekly" | "annual"
export type RetryPreference = "standard" | "aggressive" | "lenient"

export type MerchantSetupInput = {
  businessName: string
  category: string
  pricingModel: PricingModel
  pricePoints: number[]
  currency: string
  billingInterval: BillingInterval
  retryPreference: RetryPreference
  webhookEndpointUrl?: string
}

export type SetupWebhookTestResult = {
  tested: boolean
  delivered: boolean
  status_code: number
  response_time_ms: number
  attempts: number
  error: string | null
}

export type MerchantSetupResult = {
  plans: ReturnType<typeof formatPlanForApi>[]
  apiKey: string
  apiKeyTest: string
  webhookTest: SetupWebhookTestResult | null
  codeSnippet: string
  checkoutLinks: { plan_id: number; url: string }[]
  monitoringEnabled: boolean
}

const TIERED_NAMES = ["Starter", "Growth", "Pro", "Enterprise", "Ultimate"]
const USAGE_NAMES = ["Basic", "Standard", "Premium", "Scale"]

function genApiKey(prefix: string) {
  const bytes = crypto.randomBytes(18)
  const body = BigInt(`0x${bytes.toString("hex")}`).toString(36).slice(0, 24)
  return `${prefix}_${body}`
}

export function resolveRetryPreference(pref: RetryPreference): {
  retryAttempts: number
  retryIntervalDays: number
} {
  switch (pref) {
    case "aggressive":
      return { retryAttempts: 5, retryIntervalDays: 1 }
    case "lenient":
      return { retryAttempts: 2, retryIntervalDays: 7 }
    default:
      return { retryAttempts: 3, retryIntervalDays: 3 }
  }
}

export function planNamesForPricingModel(model: PricingModel, count: number): string[] {
  if (count <= 0) return []

  if (model === "flat_monthly") {
    return count === 1 ? ["Standard"] : Array.from({ length: count }, (_, i) =>
      i === 0 ? "Standard" : `Standard ${i + 1}`,
    )
  }

  if (model === "tiered") {
    return Array.from({ length: count }, (_, i) => TIERED_NAMES[i] ?? `Tier ${i + 1}`)
  }

  return Array.from({ length: count }, (_, i) => USAGE_NAMES[i] ?? `Usage ${i + 1}`)
}

export function buildSubscribeCodeSnippet(apiKey: string, planId: number): string {
  return `import { Subflow } from "@subflow/sdk"

const subflow = new Subflow("${apiKey}")
const subscriber = await subflow.subscribe({
  planId: ${planId},
  email: "customer@example.com",
  name: "Customer Name",
})
console.log("Checkout:", subscriber.checkout_url)`
}

export function parseSetupBody(
  body: Record<string, unknown>,
): MerchantSetupInput | { error: string } {
  const businessName =
    typeof body.business_name === "string" ? body.business_name.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : ""

  const pricingModel = body.pricing_model
  const billingInterval = body.billing_interval
  const retryPreference = body.retry_preference

  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : "NGN"

  let pricePoints: number[] = []
  if (Array.isArray(body.price_points)) {
    pricePoints = body.price_points
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0)
  }

  const webhookRaw = body.webhook_endpoint_url
  const webhookEndpointUrl =
    typeof webhookRaw === "string" && webhookRaw.trim() ? webhookRaw.trim() : undefined

  if (!businessName) {
    return { error: "business_name is required." }
  }
  if (!category || !MERCHANT_CATEGORIES.includes(category as (typeof MERCHANT_CATEGORIES)[number])) {
    return {
      error: `category must be one of: ${MERCHANT_CATEGORIES.join(", ")}.`,
    }
  }
  if (
    pricingModel !== "flat_monthly" &&
    pricingModel !== "tiered" &&
    pricingModel !== "usage_based"
  ) {
    return {
      error: 'pricing_model must be "flat_monthly", "tiered", or "usage_based".',
    }
  }
  if (pricePoints.length === 0) {
    return { error: "price_points must be a non-empty array of positive numbers (NGN)." }
  }
  if (currency !== "NGN") {
    return { error: 'Only currency "NGN" is supported today.' }
  }
  if (
    billingInterval !== "monthly" &&
    billingInterval !== "weekly" &&
    billingInterval !== "annual"
  ) {
    return {
      error: 'billing_interval must be "monthly", "weekly", or "annual".',
    }
  }
  if (
    retryPreference !== "standard" &&
    retryPreference !== "aggressive" &&
    retryPreference !== "lenient"
  ) {
    return {
      error: 'retry_preference must be "standard", "aggressive", or "lenient".',
    }
  }

  return {
    businessName,
    category,
    pricingModel,
    pricePoints,
    currency,
    billingInterval,
    retryPreference,
    webhookEndpointUrl,
  }
}

async function ensureMerchantApiKeys(userId: string) {
  const [m] = await db.select().from(merchant).where(eq(merchant.userId, userId)).limit(1)
  if (!m) {
    throw new Error("Merchant record not found.")
  }

  const updates: Partial<typeof merchant.$inferInsert> = {}
  if (!m.liveApiKey?.trim()) updates.liveApiKey = genApiKey("sk_live")
  if (!m.testApiKey?.trim()) updates.testApiKey = genApiKey("sk_test")

  if (Object.keys(updates).length > 0) {
    const [updated] = await db
      .update(merchant)
      .set(updates)
      .where(eq(merchant.userId, userId))
      .returning()
    return updated ?? { ...m, ...updates }
  }

  return m
}

async function enableMonitoringForPlans(userId: string, planIds: number[]) {
  const today = new Date().toISOString().slice(0, 10)
  for (const planId of planIds) {
    await db
      .insert(planMetricSnapshot)
      .values({
        userId,
        planId,
        snapshotDate: today,
        mrr: 0,
        activeSubscribers: 0,
        monitoringEnabled: true,
      })
      .onConflictDoUpdate({
        target: [planMetricSnapshot.userId, planMetricSnapshot.planId, planMetricSnapshot.snapshotDate],
        set: { monitoringEnabled: true },
      })
  }
}

/** Core merchant auto-setup — used by POST /api/v1/setup and the onboarding wizard. */
export async function runMerchantSetup(
  userId: string,
  input: MerchantSetupInput,
): Promise<MerchantSetupResult> {
  const retry = resolveRetryPreference(input.retryPreference)
  const planNames = planNamesForPricingModel(input.pricingModel, input.pricePoints.length)

  const descriptions: Record<PricingModel, string> = {
    flat_monthly: "Flat monthly subscription",
    tiered: "Tiered subscription plan",
    usage_based: "Usage-based subscription plan",
  }

  const createdPlans = []
  for (let i = 0; i < input.pricePoints.length; i++) {
    const created = await createPlanForUser(userId, {
      name: planNames[i],
      description: descriptions[input.pricingModel],
      amount: input.pricePoints[i],
      currency: input.currency,
      interval: input.billingInterval,
      trialDays: 0,
      retryAttempts: retry.retryAttempts,
      retryIntervalDays: retry.retryIntervalDays,
    })
    createdPlans.push(created)
  }

  const m = await ensureMerchantApiKeys(userId)

  await db
    .update(merchant)
    .set({
      businessName: input.businessName,
      category: input.category,
      onboardingComplete: true,
      ...(input.webhookEndpointUrl ? { webhookUrl: input.webhookEndpointUrl } : {}),
    })
    .where(eq(merchant.userId, userId))

  let webhookTest: SetupWebhookTestResult | null = null
  if (input.webhookEndpointUrl) {
    const dispatch = await dispatchMerchantWebhook(
      userId,
      "test.ping",
      {
        subscriber_id: null,
        email: "",
        plan_id: null,
        amount: 0,
        message: "Subflow auto-setup webhook connectivity test.",
      },
      { bypassSubscriptionFilter: true },
    )
    const formatted = formatWebhookTestResult(dispatch)
    if ("error" in formatted) {
      webhookTest = {
        tested: true,
        delivered: false,
        status_code: 0,
        response_time_ms: 0,
        attempts: 0,
        error: formatted.error,
      }
    } else {
      webhookTest = {
        tested: true,
        delivered: formatted.delivered,
        status_code: formatted.status_code,
        response_time_ms: formatted.response_time_ms,
        attempts: formatted.attempts,
        error: formatted.error ?? null,
      }
    }
  }

  const planIds = createdPlans.map((p) => p.id)
  await enableMonitoringForPlans(userId, planIds)

  const formattedPlans = createdPlans.map(formatPlanForApi)
  const primaryPlanId = formattedPlans[0]?.id ?? 0

  return {
    plans: formattedPlans,
    apiKey: m.liveApiKey,
    apiKeyTest: m.testApiKey,
    webhookTest,
    codeSnippet: buildSubscribeCodeSnippet(m.liveApiKey, primaryPlanId),
    checkoutLinks: formattedPlans.map((p) => ({
      plan_id: p.id,
      url: buildHostedCheckoutUrl(p.id),
    })),
    monitoringEnabled: true,
  }
}

export { PlanValidationError }
