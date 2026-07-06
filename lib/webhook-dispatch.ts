import "server-only"

import { db } from "@/lib/db"
import { merchant, webhookDelivery } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Real outbound webhook delivery.
 *
 * Every row written to webhook_delivery corresponds to exactly one HTTP POST
 * that actually left this server. Status code 0 means the request got no HTTP
 * response at all (DNS failure / connection refused / timeout) — the `error`
 * column carries the real network error. Nothing here is simulated.
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

async function postOnce(endpoint: string, body: string) {
  const started = Date.now()
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Subflow-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    })
    // Drain the body so the connection is released; response content is not used.
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
  event: string,
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

  const body = JSON.stringify({
    event,
    created_at: new Date().toISOString(),
    data: payload,
  })

  const attempts: {
    attempt: number
    statusCode: number
    responseTimeMs: number
    error: string | null
  }[] = []

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await postOnce(endpoint, body)
    attempts.push({ attempt, ...result })

    // Record the real result of this exact HTTP request.
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
      `[webhook] POST ${endpoint} event=${event} attempt=${attempt} status=${result.statusCode} ` +
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
