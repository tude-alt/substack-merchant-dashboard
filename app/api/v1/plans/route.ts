import { authenticateMerchant } from "@/lib/api/auth"
import { apiInvalidRequest, apiUnauthorized } from "@/lib/api/errors"
import {
  createPlanForUser,
  formatPlanForApi,
  listPlansForUser,
  parsePlanInputFromBody,
  PlanValidationError,
} from "@/lib/plans"

export async function GET(request: Request) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const rows = await listPlansForUser(auth.merchant.userId)
  return Response.json({ data: rows.map(formatPlanForApi) })
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

  const input = parsePlanInputFromBody(body)

  try {
    const created = await createPlanForUser(auth.merchant.userId, input)
    return Response.json({ data: formatPlanForApi(created) }, { status: 201 })
  } catch (e) {
    if (e instanceof PlanValidationError) {
      return apiInvalidRequest(e.message)
    }
    throw e
  }
}
