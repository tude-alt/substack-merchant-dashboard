#!/usr/bin/env node
/**
 * Lightweight contract tests for API parsing helpers (no database required).
 */
import assert from "node:assert/strict"

// Inline copies of parsing logic for standalone test — keep in sync with lib/api/subscribers.ts
function parsePlanId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed)
      return Number.isInteger(n) && n > 0 ? n : null
    }
  }
  return null
}

function parseSubscriberCreateBody(body) {
  const customer =
    body.customer && typeof body.customer === "object" && !Array.isArray(body.customer)
      ? body.customer
      : null

  const name =
    (typeof body.name === "string" ? body.name.trim() : "") ||
    (customer && typeof customer.name === "string" ? customer.name.trim() : "")

  const email =
    (typeof body.email === "string" ? body.email.trim() : "") ||
    (customer && typeof customer.email === "string" ? customer.email.trim() : "")

  const phone =
    (typeof body.phone === "string" ? body.phone.trim() : "") ||
    (customer && typeof customer.phone === "string" ? customer.phone.trim() : "")

  const planId = parsePlanId(body.plan_id)

  if (!name || !email || planId === null) {
    return { error: "missing fields" }
  }

  return { name, email, phone, planId }
}

// plan_id type coercion
assert.equal(parsePlanId(1), 1)
assert.equal(parsePlanId("42"), 42)
assert.equal(parsePlanId(" 7 "), 7)
assert.equal(parsePlanId("1.5"), null)
assert.equal(parsePlanId(0), null)

// flat contract
assert.deepEqual(parseSubscriberCreateBody({
  name: "Ada",
  email: "ada@test.com",
  plan_id: 3,
  phone: "+234",
}), { name: "Ada", email: "ada@test.com", phone: "+234", planId: 3 })

// nested customer contract (legacy)
assert.deepEqual(parseSubscriberCreateBody({
  customer: { name: "Ada", email: "ada@test.com", phone: "+234" },
  plan_id: "3",
}), { name: "Ada", email: "ada@test.com", phone: "+234", planId: 3 })

// flat wins over nested when both present
assert.deepEqual(parseSubscriberCreateBody({
  name: "Flat",
  email: "flat@test.com",
  customer: { name: "Nested", email: "nested@test.com" },
  plan_id: 1,
}), { name: "Flat", email: "flat@test.com", phone: "", planId: 1 })

assert.ok("error" in parseSubscriberCreateBody({ email: "x@y.com", plan_id: 1 }))

console.log("All API contract parsing tests passed.")
