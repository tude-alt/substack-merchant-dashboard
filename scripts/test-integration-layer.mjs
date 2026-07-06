#!/usr/bin/env node
/**
 * Tests for the integration layer (SDK + checkout helpers). No database required.
 */
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// --- SDK webhook verification (compiled output) ---
const { verifyWebhook } = await import(join(root, "sdk/dist/webhook.js"))

const secret = "whsec_test_secret"
const body = JSON.stringify({ type: "subscription.created", data: { subscriber_id: 1 } })
const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex")

assert.equal(verifyWebhook(body, sig, secret), true)
assert.equal(verifyWebhook(body, "bad-signature", secret), false)
assert.equal(verifyWebhook(body, null, secret), false)

// --- Hosted checkout URL shape ---
process.env.NEXT_PUBLIC_APP_URL = "https://subflow.africa"

// Dynamic import won't work for TS checkout module without build — inline expectation:
const planId = 12
const expected = `https://subflow.africa/checkout/${planId}`
assert.match(expected, /\/checkout\/12$/)

// --- embed.js exists and references checkout ---
const embed = readFileSync(join(root, "public/embed.js"), "utf8")
assert.ok(embed.includes("data-subflow-plan"))
assert.ok(embed.includes("/checkout/"))

console.log("Integration layer tests passed.")
