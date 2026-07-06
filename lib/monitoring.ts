import "server-only"

import { db } from "@/lib/db"
import { plan, planMetricSnapshot, subscriber, transaction } from "@/lib/db/schema"
import { and, eq, gte, inArray, sql } from "drizzle-orm"

export type PlanMonitoringRow = {
  planId: number
  planName: string
  mrr: number
  activeSubscribers: number
  churnRate30d: number
  failedChargeRate7d: number
  mrrTrend: { date: string; mrr: number }[]
  hasActivity: boolean
}

export type MonitoringAlert = {
  planId: number
  planName: string
  type: "failed_charge_rate" | "churn_rate"
  rate: number
  threshold: number
  message: string
}

const FAILED_CHARGE_THRESHOLD = 15
const CHURN_THRESHOLD = 10

/** Record today's MRR snapshot per plan (idempotent). */
export async function snapshotPlanMetrics(userId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      planId: subscriber.planId,
      mrr: sql<number>`coalesce(sum(${subscriber.mrr}), 0)::bigint`,
      activeSubscribers: sql<number>`count(*)::int`,
    })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), eq(subscriber.status, "active")))
    .groupBy(subscriber.planId)

  const allPlans = await db.select({ id: plan.id }).from(plan).where(eq(plan.userId, userId))
  const mrrByPlan = new Map(rows.map((r) => [r.planId, r]))

  for (const p of allPlans) {
    const stats = mrrByPlan.get(p.id)
    await db
      .insert(planMetricSnapshot)
      .values({
        userId,
        planId: p.id,
        snapshotDate: today,
        mrr: Number(stats?.mrr ?? 0),
        activeSubscribers: Number(stats?.activeSubscribers ?? 0),
        monitoringEnabled: true,
      })
      .onConflictDoUpdate({
        target: [
          planMetricSnapshot.userId,
          planMetricSnapshot.planId,
          planMetricSnapshot.snapshotDate,
        ],
        set: {
          mrr: Number(stats?.mrr ?? 0),
          activeSubscribers: Number(stats?.activeSubscribers ?? 0),
          monitoringEnabled: true,
        },
      })
  }
}

export async function getPlanMonitoring(userId: string): Promise<PlanMonitoringRow[]> {
  await snapshotPlanMetrics(userId)

  const plans = await db
    .select()
    .from(plan)
    .where(eq(plan.userId, userId))
    .orderBy(plan.createdAt)

  if (plans.length === 0) return []

  const planIds = plans.map((p) => p.id)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const churnRows = await db
    .select({
      planId: subscriber.planId,
      churned: sql<number>`count(*) filter (where ${subscriber.status} in ('cancelled', 'suspended'))::int`,
      active: sql<number>`count(*) filter (where ${subscriber.status} = 'active')::int`,
    })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), inArray(subscriber.planId, planIds)))
    .groupBy(subscriber.planId)

  const churnMap = new Map(
    churnRows.map((r) => [
      r.planId,
      { churned: Number(r.churned), active: Number(r.active) },
    ]),
  )

  const chargeRows = await db
    .select({
      planName: transaction.planName,
      failed: sql<number>`count(*) filter (where ${transaction.status} = 'failed' and ${transaction.createdAt} >= ${sevenDaysAgo})::int`,
      total: sql<number>`count(*) filter (where ${transaction.status} in ('failed', 'successful') and ${transaction.createdAt} >= ${sevenDaysAgo})::int`,
    })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), gte(transaction.createdAt, sevenDaysAgo)))
    .groupBy(transaction.planName)

  const chargeByPlanName = new Map(
    chargeRows.map((r) => [
      r.planName,
      { failed: Number(r.failed), total: Number(r.total) },
    ]),
  )

  const trendStart = new Date()
  trendStart.setDate(trendStart.getDate() - 29)
  const trendRows = await db
    .select()
    .from(planMetricSnapshot)
    .where(
      and(
        eq(planMetricSnapshot.userId, userId),
        inArray(planMetricSnapshot.planId, planIds),
        gte(planMetricSnapshot.snapshotDate, trendStart.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(planMetricSnapshot.snapshotDate)

  const trendByPlan = new Map<number, { date: string; mrr: number }[]>()
  for (const row of trendRows) {
    const list = trendByPlan.get(row.planId) ?? []
    list.push({ date: String(row.snapshotDate), mrr: Number(row.mrr) })
    trendByPlan.set(row.planId, list)
  }

  const subscriberCounts = await db
    .select({
      planId: subscriber.planId,
      total: sql<number>`count(*)::int`,
    })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), inArray(subscriber.planId, planIds)))
    .groupBy(subscriber.planId)

  const hasActivitySet = new Set(
    subscriberCounts.filter((r) => Number(r.total) > 0).map((r) => r.planId),
  )

  const mrrRows = await db
    .select({
      planId: subscriber.planId,
      mrr: sql<number>`coalesce(sum(${subscriber.mrr}), 0)::bigint`,
    })
    .from(subscriber)
    .where(
      and(
        eq(subscriber.userId, userId),
        inArray(subscriber.planId, planIds),
        eq(subscriber.status, "active"),
      ),
    )
    .groupBy(subscriber.planId)

  const mrrMap = new Map(mrrRows.map((r) => [r.planId, Number(r.mrr)]))

  const results: PlanMonitoringRow[] = []
  for (const p of plans) {
    if (!hasActivitySet.has(p.id)) continue

    const churn = churnMap.get(p.id)
    const active = churn?.active ?? 0
    const churned = churn?.churned ?? 0
    const churnRate30d = active > 0 ? (churned / active) * 100 : 0

    const charges = chargeByPlanName.get(p.name) ?? { failed: 0, total: 0 }
    const failedChargeRate7d =
      charges.total > 0 ? (charges.failed / charges.total) * 100 : 0

    results.push({
      planId: p.id,
      planName: p.name,
      mrr: mrrMap.get(p.id) ?? 0,
      activeSubscribers: active,
      churnRate30d,
      failedChargeRate7d,
      mrrTrend: trendByPlan.get(p.id) ?? [],
      hasActivity: true,
    })
  }

  return results
}

export function buildMonitoringAlerts(rows: PlanMonitoringRow[]): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = []

  for (const row of rows) {
    if (row.failedChargeRate7d > FAILED_CHARGE_THRESHOLD) {
      alerts.push({
        planId: row.planId,
        planName: row.planName,
        type: "failed_charge_rate",
        rate: row.failedChargeRate7d,
        threshold: FAILED_CHARGE_THRESHOLD,
        message: `Plan ${row.planName} has an elevated failure rate (${row.failedChargeRate7d.toFixed(0)}% this week) — check payment method coverage or retry settings`,
      })
    }
    if (row.churnRate30d > CHURN_THRESHOLD) {
      alerts.push({
        planId: row.planId,
        planName: row.planName,
        type: "churn_rate",
        rate: row.churnRate30d,
        threshold: CHURN_THRESHOLD,
        message: `Plan ${row.planName} has elevated churn (${row.churnRate30d.toFixed(0)}% in the last 30 days) — review pricing or customer communication`,
      })
    }
  }

  return alerts
}
