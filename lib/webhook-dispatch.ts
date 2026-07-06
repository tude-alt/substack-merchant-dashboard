import "server-only"

import { db } from "@/lib/db"
import { merchant, webhookDelivery } from "@/lib/db/schema"
import { ensureWebhookSecret } from "@/lib/merchant-secrets"
import {
  buildWebhookEnvelope,
  computeWebhookSignature,
  type WebhookEventType,
  webhookDataFromLegacy,
} from "@/lib/webhook-payload"
import { eq } from "drizzle-orm"

/**
 * Real outbound webhook delivery.
 *
 * Payload shape:
 *   { type, data: { subscriber_id, email, plan_id, amount, attempt?, final_attempt? }, timestamp }
 *
 * Signed with HMAC-SHA256 (hex) in X-Subflow-Signature using the merchant's webhook secret.
 */

const MAX_ATTEMPTS = 3
const RETRY_DELAYS_MS = [1000, 3000]
const REQUEST_TIMEOUT_MS = 10_000

export type WebhookDispatchResult =
  | { sent: false; reason: string }
  | {
      sent: true
      delivered: boolean
      attempts: {
        attempt: number
        statusCode: number
        responseTimeMs: number
        error: string | null
      }[]
    }

async function postOnce(endpoint: string, body: string, signature: string) {
  const started = Date.now()
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Subflow-Webhooks/1.0",
        "X-Subflow-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    })
    await res.text().catch(() => {})
    return {
      statusCode: res.status,
      responseTimeMs: Date.now() - started,
      error: null as string | null,
    }
  } catch (e) {
    return {
      statusCode: 0,
      responseTimeMs: Date.now() - started,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    }
  }
}

export async function dispatchMerchantWebhook(
  userId: string,
  event: WebhookEventType,
  payload: Record<string, unknown>,
  opts: { bypassSubscriptionFilter?: boolean } = {},
): Promise<WebhookDispatchResult> {
  const [m] = await db.select().from(merchant).where(eq(merchant.userId, userId)).limit(1)

  const endpoint = m?.webhookUrl?.trim()
  if (!endpoint) {
    return { sent: false, reason: "No webhook endpoint URL configured." }
  }

  const subscribed = (m.webhookEvents ?? "").split(",").filter(Boolean)
  if (!opts.bypassSubscriptionFilter && !subscribed.includes(event)) {
    return { sent: false, reason: `Merchant is not subscribed to event "${event}".` }
  }

  const secret = await ensureWebhookSecret(userId)
  const envelope = buildWebhookEnvelope(event, webhookDataFromLegacy(payload))
  const body = JSON.stringify(envelope)
  const signature = computeWebhookSignature(body, secret)

  const attempts: {
    attempt: number
    statusCode: number
    responseTimeMs: number
    error: string | null
  }[] = []

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await postOnce(endpoint, body, signature)
    attempts.push({ attempt, ...result })

    await db.insert(webhookDelivery).values({
      userId,
      endpoint,
      event,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      attempt,
      error: result.error,
    })

    console.log(
      `[webhook] POST ${endpoint} type=${event} attempt=${attempt} status=${result.statusCode} ` +
        `time=${result.responseTimeMs}ms${result.error ? ` error=${result.error}` : ""}`,
    )

    if (result.statusCode >= 200 && result.statusCode < 300) {
      return { sent: true, delivered: true, attempts }
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]))
    }
  }

  return { sent: true, delivered: false, attempts }
}

export function formatWebhookTestResult(result: WebhookDispatchResult) {
  if (!result.sent) {
    return { ok: false as const, error: result.reason }
  }
  const last = result.attempts[result.attempts.length - 1]
  return {
    ok: result.delivered,
    delivered: result.delivered,
    status_code: last.statusCode,
    response_time_ms: last.responseTimeMs,
    attempts: result.attempts.length,
    error: last.error ?? undefined,
  }
}
