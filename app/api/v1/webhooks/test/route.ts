import { authenticateMerchant } from "@/lib/api/auth"
import { apiUnauthorized } from "@/lib/api/errors"
import { dispatchMerchantWebhook, formatWebhookTestResult } from "@/lib/webhook-dispatch"

export async function POST(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const result = await dispatchMerchantWebhook(
    auth.merchant.userId,
    "test.ping",
    {
      subscriber_id: null,
      email: "",
      plan_id: null,
      amount: 0,
      message: "Subflow webhook connectivity test.",
    },
    { bypassSubscriptionFilter: true },
  )

  const formatted = formatWebhookTestResult(result)
  if (!formatted.ok && "error" in formatted) {
    return Response.json(
      {
        error: "webhook_test_failed",
        message: formatted.error,
        details: {},
      },
      { status: 400 },
    )
  }

  return Response.json({
    data: {
      delivered: formatted.delivered,
      status_code: formatted.status_code,
      response_time_ms: formatted.response_time_ms,
      attempts: formatted.attempts,
      error: formatted.error ?? null,
    },
  })
}
