import crypto from "crypto"
import { db } from "@/lib/db"
import { activity, plan, subscriber } from "@/lib/db/schema"
import { getAppUrl } from "@/lib/billing"
import { createCheckoutOrder, NombaApiError, NombaConfigError } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { authenticateMerchant } from "@/lib/api/auth"
import {
  apiError,
  apiInvalidRequest,
  apiPlanNotFound,
  apiUnauthorized,
} from "@/lib/api/errors"
import {
  formatSubscriberCreated,
  formatSubscriberListed,
  parseSubscriberCreateBody,
} from "@/lib/api/subscribers"
import { desc, eq } from "drizzle-orm"

export async function GET(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const rows = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.userId, auth.merchant.userId))
    .orderBy(desc(subscriber.createdAt))

  return Response.json({
    data: rows.map(formatSubscriberListed),
  })
}

export async function POST(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiInvalidRequest("Request body must be valid JSON.")
  }

  const parsed = parseSubscriberCreateBody(body)
  if ("error" in parsed) {
    return apiInvalidRequest(parsed.error)
  }

  const { name, email, phone, planId } = parsed

  const [p] = await db
    .select()
    .from(plan)
    .where(eq(plan.id, planId))
    .limit(1)

  if (!p || p.userId !== auth.merchant.userId) {
    return apiPlanNotFound(planId)
  }

  const initOrderReference = `SUBFLOW-INIT-${crypto.randomUUID()}`

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
      return apiError("nomba_not_configured", e.message, 503)
    }
    if (e instanceof NombaApiError) {
      return apiError("nomba_error", e.message, 502, {
        nomba: { http_status: e.httpStatus, code: e.code, description: e.description },
      })
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
      data: formatSubscriberCreated(created),
    },
    { status: 201 },
  )
}
