import { authenticateMerchant } from "@/lib/api/auth"
import {
  buildSubscriberCreateResponse,
  createSubscriberForMerchant,
  PlanNotFoundError,
  NombaApiError,
  NombaConfigError,
} from "@/lib/api/create-subscriber"
import {
  apiError,
  apiInvalidRequest,
  apiPlanNotFound,
  apiUnauthorized,
} from "@/lib/api/errors"
import { getIdempotentResponse, storeIdempotentResponse } from "@/lib/api/idempotency"
import {
  formatSubscriberListed,
  parseSubscriberCreateBody,
} from "@/lib/api/subscribers"
import { db } from "@/lib/db"
import { subscriber } from "@/lib/db/schema"
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

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? ""
  if (idempotencyKey) {
    const cached = await getIdempotentResponse(auth.merchant.userId, idempotencyKey)
    if (cached) {
      return new Response(cached.responseBody, {
        status: cached.statusCode,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

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

  try {
    const result = await createSubscriberForMerchant({
      userId: auth.merchant.userId,
      mode: auth.mode,
      name,
      email,
      phone,
      planId,
    })

    const { data, status } = buildSubscriberCreateResponse(
      result.subscriber,
      result.kind === "created" ? "created" : "existing",
    )
    const responseBody = JSON.stringify({ data })

    if (idempotencyKey) {
      await storeIdempotentResponse(
        auth.merchant.userId,
        idempotencyKey,
        status,
        responseBody,
      )
    }

    return new Response(responseBody, {
      status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    if (e instanceof PlanNotFoundError) {
      return apiPlanNotFound(e.planId)
    }
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
}
