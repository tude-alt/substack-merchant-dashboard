import { authenticateMerchant } from "@/lib/api/auth"
import { apiInvalidRequest, apiUnauthorized } from "@/lib/api/errors"
import {
  parseSetupBody,
  runMerchantSetup,
  PlanValidationError,
} from "@/lib/merchant-setup"

export async function POST(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiInvalidRequest("Request body must be valid JSON.")
  }

  const parsed = parseSetupBody(body)
  if ("error" in parsed) {
    return apiInvalidRequest(parsed.error)
  }

  try {
    const result = await runMerchantSetup(auth.merchant.userId, parsed)
    return Response.json(
      {
        data: {
          plans: result.plans,
          api_key: result.apiKey,
          api_key_test: result.apiKeyTest,
          webhook_test: result.webhookTest,
          code_snippet: result.codeSnippet,
          checkout_links: result.checkoutLinks,
          monitoring_enabled: result.monitoringEnabled,
        },
      },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof PlanValidationError) {
      return apiInvalidRequest(e.message)
    }
    console.error("[api] POST /api/v1/setup failed:", e)
    return Response.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred during merchant setup.",
        details: {},
      },
      { status: 500 },
    )
  }
}
