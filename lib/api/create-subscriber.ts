import crypto from "crypto"
import { db } from "@/lib/db"
import { activity, plan, subscriber } from "@/lib/db/schema"
import { getAppUrl } from "@/lib/billing"
import { appendOrderReferenceToCallbackUrl } from "@/lib/confirm-payment"
import { createCheckoutOrder, NombaApiError, NombaConfigError } from "@/lib/nomba"
import { dispatchMerchantWebhook } from "@/lib/webhook-dispatch"
import { formatSubscriberCreated } from "@/lib/api/subscribers"
import { and, eq, sql } from "drizzle-orm"

export type CreateSubscriberInput = {
  userId: string
  mode: "live" | "test"
  name: string
  email: string
  phone: string
  planId: number
  /** Where the signup originated — affects dashboard activity copy. */
  channel?: "api" | "checkout"
  /** Nomba redirect after payment; defaults to merchant dashboard subscribers list. */
  callbackUrl?: string
}

export type CreateSubscriberResult =
  | { kind: "created"; subscriber: typeof subscriber.$inferSelect }
  | { kind: "existing"; subscriber: typeof subscriber.$inferSelect }

export async function findSubscriberByEmailAndPlan(
  userId: string,
  email: string,
  planId: number,
) {
  const [row] = await db
    .select()
    .from(subscriber)
    .where(
      and(
        eq(subscriber.userId, userId),
        eq(subscriber.planId, planId),
        sql`lower(${subscriber.email}) = ${email.toLowerCase()}`,
      ),
    )
    .limit(1)
  return row ?? null
}

export async function createSubscriberForMerchant(
  input: CreateSubscriberInput,
): Promise<CreateSubscriberResult> {
  const existing = await findSubscriberByEmailAndPlan(
    input.userId,
    input.email,
    input.planId,
  )
  if (existing) {
    return { kind: "existing", subscriber: existing }
  }

  const [p] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, input.planId), eq(plan.userId, input.userId)))
    .limit(1)
  if (!p) {
    throw new PlanNotFoundError(input.planId)
  }

  const initOrderReference = `SUBFLOW-INIT-${crypto.randomUUID()}`

  const callbackBase = input.callbackUrl?.trim() || `${getAppUrl()}/dashboard/subscribers`
  const callbackUrl = appendOrderReferenceToCallbackUrl(callbackBase, initOrderReference)

  const order = await createCheckoutOrder({
    amountKobo: p.amount,
    currency: p.currency,
    customerEmail: input.email,
    customerId: input.email,
    orderReference: initOrderReference,
    callbackUrl,
  })

  const [created] = await db
    .insert(subscriber)
    .values({
      userId: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      planId: p.id,
      planName: p.name,
      status: "pending_payment",
      lastChargeResult: "none",
      mrr: 0,
      initOrderReference,
      checkoutLink: order.checkoutLink,
      billingDate: new Date(),
    })
    .returning()

  if (!created) {
    throw new Error("Subscriber insert did not return a row.")
  }

  const activityMessage =
    input.channel === "checkout"
      ? `${input.name} started checkout for ${p.name} — payment not completed yet`
      : `${input.name} subscribed to ${p.name} via API (${input.mode} key) — awaiting first payment`

  await db.insert(activity).values({
    userId: input.userId,
    type: "subscription.created",
    message: activityMessage,
  })

  try {
    await dispatchMerchantWebhook(input.userId, "subscription.created", {
      subscriber_id: created.id,
      email: input.email,
      plan_id: p.id,
      amount: p.amount,
    })
  } catch (e) {
    console.error("[create-subscriber] merchant webhook dispatch failed:", e)
  }

  return { kind: "created", subscriber: created }
}

export function buildSubscriberCreateResponse(
  row: typeof subscriber.$inferSelect,
  kind: "created" | "existing",
) {
  const data = formatSubscriberCreated(row, {
    idempotent: kind === "existing",
    message:
      kind === "existing"
        ? "Existing subscriber returned for this email and plan_id."
        : undefined,
  })
  return { data, status: kind === "created" ? 201 : 200 }
}

export class PlanNotFoundError extends Error {
  planId: number
  constructor(planId: number) {
    super(`Plan ${planId} not found`)
    this.name = "PlanNotFoundError"
    this.planId = planId
  }
}

export { NombaApiError, NombaConfigError }
