import type { subscriber } from "@/lib/db/schema"

export type SubscriberRow = typeof subscriber.$inferSelect

export const PAYMENT_METHOD_CHECKOUT = "nomba_checkout_link" as const
export const LEGACY_PAYMENT_METHOD_VA = "nomba_virtual_account" as const

export type PaymentMethod = typeof PAYMENT_METHOD_CHECKOUT

/** Shape returned by POST /api/v1/subscribers and single-subscriber GET routes. */
export function formatSubscriberCreated(
  s: SubscriberRow,
  options?: { message?: string; idempotent?: boolean },
) {
  const active = s.status === "active"
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    plan_id: s.planId,
    plan_name: s.planName,
    status: s.status,
    payment_method: "checkout_link" as const,
    checkout_url: s.checkoutLink,
    checkout_link: s.checkoutLink,
    order_reference: s.initOrderReference,
    subscription_becomes_active_on:
      "nomba_payment_success_webhook" as const,
    subscription_active: active,
    message:
      options?.message ??
      (active
        ? "Subscription is active. Recurring charges run on the plan billing schedule."
        : options?.idempotent
          ? "Existing subscriber returned for this email and plan_id."
          : "Subscriber created. Send the customer to checkout_url to complete the first payment. " +
            "The subscription becomes active when Nomba confirms payment via webhook (not on redirect)."),
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
    payment_method: "checkout_link" as const,
    checkout_url: s.checkoutLink,
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
  paymentMethod: PaymentMethod
}

function parsePaymentMethod(body: Record<string, unknown>): PaymentMethod | { error: string } {
  const raw =
    typeof body.payment_method === "string" ? body.payment_method.trim() : PAYMENT_METHOD_CHECKOUT

  if (raw === PAYMENT_METHOD_CHECKOUT || raw === "") {
    return PAYMENT_METHOD_CHECKOUT
  }

  if (raw === LEGACY_PAYMENT_METHOD_VA) {
    return {
      error:
        `payment_method "${LEGACY_PAYMENT_METHOD_VA}" is not supported. ` +
        `Subflow issues a Nomba hosted checkout link (card tokenization). ` +
        `Use payment_method "${PAYMENT_METHOD_CHECKOUT}" instead.`,
    }
  }

  return {
    error:
      `Unsupported payment_method "${raw}". ` +
      `Supported value: "${PAYMENT_METHOD_CHECKOUT}".`,
  }
}

/**
 * Parse subscriber create fields from the API body.
 * Canonical contract is flat: { name, email, plan_id, phone?, payment_method? }.
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
    (typeof body.email === "string" ? body.email.trim().toLowerCase() : "") ||
    (customer && typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "")

  const phone =
    (typeof body.phone === "string" ? body.phone.trim() : "") ||
    (customer && typeof customer.phone === "string" ? customer.phone.trim() : "")

  const planId = parsePlanId(body.plan_id)
  const paymentMethod = parsePaymentMethod(body)

  if ("error" in paymentMethod) return paymentMethod

  if (!name || !email || planId === null) {
    return {
      error:
        "Required fields: name (string), email (string), plan_id (integer or numeric string). " +
        "Send them at the top level or inside customer: { name, email, phone? }.",
    }
  }

  return { name, email, phone, planId, paymentMethod }
}
