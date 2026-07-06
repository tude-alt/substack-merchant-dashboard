export type ApiErrorBody = {
  error: string
  message: string
  details: Record<string, unknown>
}

export function apiError(
  error: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return Response.json({ error, message, details } satisfies ApiErrorBody, { status })
}

export function apiUnauthorized() {
  return apiError(
    "unauthorized",
    "Provide your API key from Settings as a Bearer token: Authorization: Bearer sk_live_... (or sk_test_...)",
    401,
  )
}

export function apiNotFound(message = "The requested resource was not found.") {
  return apiError("not_found", message, 404)
}

export function apiPlanNotFound(planId: number) {
  return apiError(
    "plan_not_found",
    `Plan ${planId} does not exist for this merchant. Create it on the Plans page or via POST /api/v1/plans first.`,
    404,
    { plan_id: planId },
  )
}

export function apiRouteNotFound(path: string) {
  return apiError("route_not_found", `No API route matches ${path}.`, 404, { path })
}

export function apiInvalidRequest(
  message: string,
  details: Record<string, unknown> = {},
) {
  return apiError("invalid_request", message, 400, details)
}
