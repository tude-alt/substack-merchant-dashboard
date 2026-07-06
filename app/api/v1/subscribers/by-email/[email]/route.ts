import { db } from "@/lib/db"
import { subscriber } from "@/lib/db/schema"
import { authenticateMerchant } from "@/lib/api/auth"
import { apiInvalidRequest, apiNotFound, apiUnauthorized } from "@/lib/api/errors"
import { formatSubscriberCreated } from "@/lib/api/subscribers"
import { and, eq, sql } from "drizzle-orm"

type RouteContext = { params: Promise<{ email: string }> }

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateMerchant(request)
  if (!auth) return apiUnauthorized()

  const { email: rawEmail } = await context.params
  let email: string
  try {
    email = decodeURIComponent(rawEmail).trim().toLowerCase()
  } catch {
    return apiInvalidRequest("Email path segment must be URL-encoded.", { email: rawEmail })
  }

  if (!email || !email.includes("@")) {
    return apiInvalidRequest("A valid email address is required.", { email })
  }

  const [row] = await db
    .select()
    .from(subscriber)
    .where(
      and(
        eq(subscriber.userId, auth.merchant.userId),
        sql`lower(${subscriber.email}) = ${email}`,
      ),
    )
    .limit(1)

  if (!row) {
    return apiNotFound(`No subscriber found with email ${email}.`)
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
