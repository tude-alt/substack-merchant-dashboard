import type { subscriber } from "@/lib/db/schema"

export type SubscriberRow = typeof subscriber.$inferSelect

/** Shape returned by POST /api/v1/subscribers and single-subscriber GET routes. */
export function formatSubscriberCreated(s: SubscriberRow, options?: { message?: string }) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    plan_id: s.planId,
    plan_name: s.planName,
    status: s.status,
    order_reference: s.initOrderReference,
    checkout_link: s.checkoutLink,
    message:
      options?.message ??
      "Subscriber created. Send the customer to checkout_link to complete the first payment; " +
        "Nomba will tokenize the card and the subscription becomes active via webhook.",
  }
}

/** Shape returned by GET /api/v1/subscribers list endpoint. */
export function formatSubscriberListed(s: SubscriberRow) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    plan_id: s.planId,
    plan_name: s.planName,
    status: s.status,
    last_charge_result: s.lastChargeResult,
    billing_date: s.billingDate,
    has_tokenized_card: Boolean(s.nombaTokenKey),
    checkout_link: s.checkoutLink,
    created_at: s.createdAt,
  }
}

/** Accept plan_id as integer or numeric string. */
export function parsePlanId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed)
      return Number.isInteger(n) && n > 0 ? n : null
    }
  }
  return null
}

export type SubscriberCreateFields = {
  name: string
  email: string
  phone: string
  planId: number
}

/**
 * Parse subscriber create fields from the API body.
 * Canonical contract is flat: { name, email, plan_id, phone? }.
 * Also accepts legacy nested: { customer: { name, email, phone? }, plan_id }.
 */
export function parseSubscriberCreateBody(
  body: Record<string, unknown>,
): SubscriberCreateFields | { error: string } {
  const customer =
    body.customer && typeof body.customer === "object" && !Array.isArray(body.customer)
      ? (body.customer as Record<string, unknown>)
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
    return {
      error:
        "Required fields: name (string), email (string), plan_id (integer or numeric string). " +
        "Send them at the top level or inside customer: { name, email, phone? }.",
    }
  }

  return { name, email, phone, planId }
}
