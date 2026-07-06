/**
 * Standardized outbound webhook envelope sent to merchant endpoints.
 *
 * Verification (document this for integrators):
 *   1. Read the raw request body as a string (before JSON parsing).
 *   2. Compute HMAC-SHA256 using your SUBFLOW_WEBHOOK_SECRET (Settings → Integrations).
 *   3. Compare the hex digest to the X-Subflow-Signature header (constant-time).
 */

import crypto from "crypto"

export const WEBHOOK_EVENT_TYPES = [
  "subscription.created",
  "charge.success",
  "charge.failed",
  "charge.retried",
  "subscription.cancelled",
  "test.ping",
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

export type WebhookEventData = {
  subscriber_id: number | null
  email: string
  plan_id: number | null
  amount: number
  attempt?: number
  final_attempt?: boolean
}

export type WebhookEnvelope = {
  type: WebhookEventType
  data: WebhookEventData
  timestamp: string
}

export function buildWebhookEnvelope(
  type: WebhookEventType,
  input: Partial<WebhookEventData> & Pick<WebhookEventData, "subscriber_id">,
): WebhookEnvelope {
  const data: WebhookEventData = {
    subscriber_id: input.subscriber_id,
    email: input.email ?? "",
    plan_id: input.plan_id ?? null,
    amount: input.amount ?? 0,
  }

  if (type === "charge.retried" || type === "charge.failed") {
    if (input.attempt !== undefined) data.attempt = input.attempt
    if (input.final_attempt !== undefined) data.final_attempt = input.final_attempt
  }

  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  }
}

/** Map legacy dispatch fields into the standardized webhook data object. */
export function webhookDataFromLegacy(payload: Record<string, unknown>): WebhookEventData {
  return {
    subscriber_id:
      typeof payload.subscriber_id === "number"
        ? payload.subscriber_id
        : payload.subscriber_id != null
          ? Number(payload.subscriber_id)
          : null,
    email:
      (typeof payload.email === "string" ? payload.email : "") ||
      (typeof payload.customer_email === "string" ? payload.customer_email : ""),
    plan_id:
      typeof payload.plan_id === "number"
        ? payload.plan_id
        : payload.plan_id != null
          ? Number(payload.plan_id)
          : null,
    amount:
      typeof payload.amount === "number"
        ? payload.amount
        : typeof payload.amount_kobo === "number"
          ? payload.amount_kobo
          : 0,
    attempt:
      typeof payload.attempt === "number"
        ? payload.attempt
        : typeof payload.retry_attempt === "number"
          ? payload.retry_attempt
          : undefined,
    final_attempt:
      typeof payload.final_attempt === "boolean"
        ? payload.final_attempt
        : typeof payload.retries_remaining === "number"
          ? payload.retries_remaining === 0
          : undefined,
  }
}

export function computeWebhookSignature(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
}
