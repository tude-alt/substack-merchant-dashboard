import crypto from "crypto"
import { db } from "@/lib/db"
import { activity, merchant, plan, subscriber } from "@/lib/db/schema"
import { getAppUrl } from "@/lib/billing"
import { createCheckoutOrder, NombaApiError, NombaConfigError } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { and, desc, eq, or } from "drizzle-orm"

/**
 * Public merchant API. Authenticated with the merchant's real sk_live_/sk_test_
 * key from Settings, checked against the merchant table in Postgres.
 */

async function authenticateMerchant(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  const match = header.match(/^Bearer\s+(sk_(?:live|test)_[a-z0-9]+)$/i)
  if (!match) return null
  const key = match[1]
  const [m] = await db
    .select()
    .from(merchant)
    .where(or(eq(merchant.liveApiKey, key), eq(merchant.testApiKey, key)))
    .limit(1)
  if (!m) return null
  return { merchant: m, mode: key === m.liveApiKey ? ("live" as const) : ("test" as const) }
}

function unauthorized() {
  return Response.json(
    {
      error: "unauthorized",
      message:
        "Provide your API key from Settings as a Bearer token: Authorization: Bearer sk_live_... (or sk_test_...)",
    },
    { status: 401 },
  )
}

export async function GET(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return unauthorized()

  const rows = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.userId, auth.merchant.userId))
    .orderBy(desc(subscriber.createdAt))

  return Response.json({
    data: rows.map((s) => ({
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
    })),
  })
}

export async function POST(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return unauthorized()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "invalid_request", message: "Request body must be valid JSON." },
      { status: 400 },
    )
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const planId = Number(body.plan_id)

  if (!name || !email || !Number.isInteger(planId)) {
    return Response.json(
      {
        error: "invalid_request",
        message: "Required fields: name (string), email (string), plan_id (integer).",
      },
      { status: 400 },
    )
  }

  // plan_id must be a real plan belonging to this merchant.
  const [p] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, planId), eq(plan.userId, auth.merchant.userId)))
    .limit(1)
  if (!p) {
    return Response.json(
      {
        error: "plan_not_found",
        message: `Plan ${planId} does not exist for this merchant. Create it on the Plans page first.`,
      },
      { status: 404 },
    )
  }

  const initOrderReference = `SUBFLOW-INIT-${crypto.randomUUID()}`

  // Real Nomba checkout order (tokenizeCard: true) BEFORE persisting, so a
  // subscriber row is only created when Nomba actually accepted the order.
  let checkoutLink: string
  try {
    const order = await createCheckoutOrder({
      amountKobo: p.amount,
      currency: p.currency,
      customerEmail: email,
      customerId: email,
      orderReference: initOrderReference,
      callbackUrl: `${getAppUrl()}/dashboard/subscribers`,
    })
    checkoutLink = order.checkoutLink
  } catch (e) {
    if (e instanceof NombaConfigError) {
      return Response.json(
        { error: "nomba_not_configured", message: e.message },
        { status: 503 },
      )
    }
    if (e instanceof NombaApiError) {
      // Surface Nomba's real error verbatim — no fallback, no fake link.
      return Response.json(
        {
          error: "nomba_error",
          message: e.message,
          nomba: { http_status: e.httpStatus, code: e.code, description: e.description },
        },
        { status: 502 },
      )
    }
    throw e
  }

  const [created] = await db
    .insert(subscriber)
    .values({
      userId: auth.merchant.userId,
      name,
      email,
      phone,
      planId: p.id,
      planName: p.name,
      status: "pending_payment",
      lastChargeResult: "none",
      mrr: 0,
      initOrderReference,
      checkoutLink,
      billingDate: new Date(),
    })
    .returning()

  await db.insert(activity).values({
    userId: auth.merchant.userId,
    type: "subscription.created",
    message: `${name} subscribed to ${p.name} via API (${auth.mode} key) — awaiting first payment`,
  })

  await dispatchMerchantWebhook(auth.merchant.userId, "subscription.created", {
    subscriber_id: created.id,
    name,
    email,
    plan_id: p.id,
    plan_name: p.name,
    amount_kobo: p.amount,
    currency: p.currency,
    status: created.status,
    order_reference: initOrderReference,
  })

  return Response.json(
    {
      data: {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        plan_id: created.planId,
        plan_name: created.planName,
        status: created.status,
        order_reference: initOrderReference,
        checkout_link: checkoutLink,
        message:
          "Subscriber created. Send the customer to checkout_link to complete the first payment; " +
          "Nomba will tokenize the card and the subscription becomes active via webhook.",
      },
    },
    { status: 201 },
  )
}
