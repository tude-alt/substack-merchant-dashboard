import { db } from "@/lib/db"
import { subscriber } from "@/lib/db/schema"
import { authenticateMerchant } from "@/lib/api/auth"
import {
  apiInvalidRequest,
  apiNotFound,
  apiUnauthorized,
} from "@/lib/api/errors"
import { formatSubscriberCreated, parsePlanId } from "@/lib/api/subscribers"
import { and, eq } from "drizzle-orm"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const { id } = await context.params
  const subscriberId = parsePlanId(id)
  if (subscriberId === null) {
    return apiInvalidRequest("Subscriber id must be a positive integer.", { id })
  }

  const [row] = await db
    .select()
    .from(subscriber)
    .where(
      and(eq(subscriber.id, subscriberId), eq(subscriber.userId, auth.merchant.userId)),
    )
    .limit(1)

  if (!row) {
    return apiNotFound(`Subscriber ${subscriberId} was not found.`)
  }

  return Response.json({
    data: formatSubscriberCreated(row, {
      message:
        row.status === "active"
          ? "Subscription is active. Recurring charges run on the plan billing schedule."
          : "Subscription is pending first payment. Send the customer to checkout_link; " +
            "the subscription becomes active when Nomba confirms payment via webhook.",
    }),
  })
}
