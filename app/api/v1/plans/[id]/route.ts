import { authenticateMerchant } from "@/lib/api/auth"
import {
  apiInvalidRequest,
  apiNotFound,
  apiUnauthorized,
} from "@/lib/api/errors"
import { formatPlanForApi, getPlanForUser } from "@/lib/plans"
import { parsePlanId } from "@/lib/api/subscribers"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const { id } = await context.params
  const planId = parsePlanId(id)
  if (planId === null) {
    return apiInvalidRequest("Plan id must be a positive integer.", { id })
  }

  const row = await getPlanForUser(auth.merchant.userId, planId)
  if (!row) {
    return apiNotFound(`Plan ${planId} does not exist for this merchant.`)
  }

  return Response.json({ data: formatPlanForApi(row) })
}
