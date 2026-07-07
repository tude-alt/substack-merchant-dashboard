import { db } from "@/lib/db"
import { activity, subscriber } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), eq(subscriber.status, "pending_payment")))

  const [latest] = await db
    .select({ id: activity.id, message: activity.message, type: activity.type })
    .from(activity)
    .where(eq(activity.userId, userId))
    .orderBy(desc(activity.createdAt))
    .limit(1)

  return Response.json({
    pendingPayments: Number(pending?.count ?? 0),
    latestActivity: latest ?? null,
  })
}
