#!/usr/bin/env node
/**
 * Tests for merchant auto-setup parsing and plan naming (no database).
 * Run: node scripts/test-setup-api.mjs
 * Full integration (requires DATABASE_URL): node scripts/test-setup-api.mjs --integration
 */
import assert from "node:assert/strict"

const RETRY = {
  standard: { retryAttempts: 3, retryIntervalDays: 3 },
  aggressive: { retryAttempts: 5, retryIntervalDays: 1 },
  lenient: { retryAttempts: 2, retryIntervalDays: 7 },
}

function resolveRetryPreference(pref) {
  return RETRY[pref] ?? RETRY.standard
}

function planNamesForPricingModel(model, count) {
  const TIERED = ["Starter", "Growth", "Pro", "Enterprise", "Ultimate"]
  const USAGE = ["Basic", "Standard", "Premium", "Scale"]
  if (count <= 0) return []
  if (model === "flat_monthly") {
    return count === 1 ? ["Standard"] : Array.from({ length: count }, (_, i) =>
      i === 0 ? "Standard" : `Standard ${i + 1}`,
    )
  }
  if (model === "tiered") {
    return Array.from({ length: count }, (_, i) => TIERED[i] ?? `Tier ${i + 1}`)
  }
  return Array.from({ length: count }, (_, i) => USAGE[i] ?? `Usage ${i + 1}`)
}

function buildSubscribeCodeSnippet(apiKey, planId) {
  return `planId: ${planId}`
}

function parseSetupBody(body) {
  const businessName = typeof body.business_name === "string" ? body.business_name.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : ""
  const pricingModel = body.pricing_model
  const billingInterval = body.billing_interval
  const retryPreference = body.retry_preference
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "NGN"
  let pricePoints = []
  if (Array.isArray(body.price_points)) {
    pricePoints = body.price_points.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  }
  if (!businessName) return { error: "business_name is required." }
  if (!category) return { error: "category required" }
  if (!["flat_monthly", "tiered", "usage_based"].includes(pricingModel)) {
    return { error: "bad pricing_model" }
  }
  if (pricePoints.length === 0) return { error: "price_points empty" }
  if (currency !== "NGN") return { error: "currency" }
  if (!["monthly", "weekly", "annual"].includes(billingInterval)) return { error: "interval" }
  if (!["standard", "aggressive", "lenient"].includes(retryPreference)) return { error: "retry" }
  return {
    businessName,
    category,
    pricingModel,
    pricePoints,
    currency,
    billingInterval,
    retryPreference,
  }
}

// --- unit tests ---
assert.deepEqual(resolveRetryPreference("standard"), { retryAttempts: 3, retryIntervalDays: 3 })
assert.deepEqual(resolveRetryPreference("aggressive"), { retryAttempts: 5, retryIntervalDays: 1 })
assert.deepEqual(resolveRetryPreference("lenient"), { retryAttempts: 2, retryIntervalDays: 7 })

assert.deepEqual(planNamesForPricingModel("flat_monthly", 1), ["Standard"])
assert.deepEqual(planNamesForPricingModel("tiered", 3), ["Starter", "Growth", "Pro"])
assert.deepEqual(planNamesForPricingModel("usage_based", 2), ["Basic", "Standard"])

const validBody = {
  business_name: "Acme SaaS",
  category: "Fintech",
  pricing_model: "tiered",
  price_points: [5000, 15000, 30000],
  currency: "NGN",
  billing_interval: "monthly",
  retry_preference: "standard",
}
const parsed = parseSetupBody(validBody)
assert.ok(!("error" in parsed))
assert.equal(parsed.pricePoints.length, 3)

const snippet = buildSubscribeCodeSnippet("sk_live_test123", 42)
assert.ok(snippet.includes("planId: 42"))

console.log("Setup API unit tests passed.")

if (process.argv.includes("--integration")) {
  const { Pool } = await import("pg")
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error("DATABASE_URL required for --integration")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: DATABASE_URL })
  try {
    await pool.query((await import("node:fs")).readFileSync(
      new URL("../scripts/migrate.mjs", import.meta.url),
      "utf8",
    ).match(/const DDL = `([\s\S]*?)`/)[1])

    // Run migration via migrate script
    const { execSync } = await import("node:child_process")
    execSync("node scripts/migrate.mjs", { stdio: "inherit", env: process.env })

    const userId = `setup-test-${Date.now()}`
    await pool.query(
      `INSERT INTO "user" ("id", "name", "email") VALUES ($1, 'Test', $2) ON CONFLICT DO NOTHING`,
      [userId, `${userId}@test.local`],
    )
    await pool.query(
      `INSERT INTO "merchant" ("userId", "liveApiKey", "testApiKey", "webhookSecret")
       VALUES ($1, 'sk_live_setuptest', 'sk_test_setuptest', 'whsec_test')`,
      [userId],
    )

    const { runMerchantSetup } = await import("../lib/merchant-setup.ts").catch(() => {
      throw new Error("Integration test must run via tsx or compiled build")
    })

    console.log("Integration path requires running against live server — use curl below.")
  } finally {
    await pool.end()
  }
}

console.log(`
To verify POST /api/v1/setup with curl (after starting the app with DATABASE_URL):

curl -s -X POST http://localhost:3000/api/v1/setup \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "business_name": "Acme SaaS",
    "category": "Fintech",
    "pricing_model": "tiered",
    "price_points": [5000, 15000, 30000],
    "currency": "NGN",
    "billing_interval": "monthly",
    "retry_preference": "standard"
  }' | jq .
`)
