"use server"

import { db } from "@/lib/db"
import { subscriber, transaction, activity } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, desc, eq, gte, sql } from "drizzle-orm"

export type DashboardData = {
  mrr: number
  activeSubscribers: number
  failedThisMonth: number
  churnRate: number
  revenueSeries: { date: string; revenue: number }[]
  activity: { id: number; type: string; message: string; createdAt: Date }[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const userId = await getUserId()

  // MRR = sum of active subscriber MRR
  const [mrrRow] = await db
    .select({ mrr: sql<number>`coalesce(sum(${subscriber.mrr}), 0)::bigint` })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), eq(subscriber.status, "active")))

  // Status counts
  const statusRows = await db
    .select({ status: subscriber.status, c: sql<number>`count(*)::int` })
    .from(subscriber)
    .where(eq(subscriber.userId, userId))
    .groupBy(subscriber.status)

  let active = 0
  let cancelled = 0
  let total = 0
  for (const r of statusRows) {
    const c = Number(r.c)
    total += c
    if (r.status === "active") active = c
    if (r.status === "cancelled") cancelled = c
  }

  // Failed charges this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const [failedRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "failed"),
        gte(transaction.createdAt, startOfMonth),
      ),
    )

  // Revenue over the last 30 days (successful charges)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const revenueRows = await db
    .select({
      day: sql<string>`to_char(${transaction.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${transaction.amount}), 0)::bigint`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "successful"),
        gte(transaction.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`to_char(${transaction.createdAt}, 'YYYY-MM-DD')`)

  const revMap = new Map(revenueRows.map((r) => [r.day, Number(r.revenue)]))
  const revenueSeries: { date: string; revenue: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    revenueSeries.push({ date: key, revenue: revMap.get(key) ?? 0 })
  }

  const recentActivity = await db
    .select()
    .from(activity)
    .where(eq(activity.userId, userId))
    .orderBy(desc(activity.createdAt))
    .limit(8)

  const churnRate = total > 0 ? (cancelled / total) * 100 : 0

  return {
    mrr: Number(mrrRow?.mrr ?? 0),
    activeSubscribers: active,
    failedThisMonth: Number(failedRow?.c ?? 0),
    churnRate,
    revenueSeries,
    activity: recentActivity,
  }
}
