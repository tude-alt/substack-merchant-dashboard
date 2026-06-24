"use server"

import { db } from "@/lib/db"
import { plan, subscriber } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type PlanInput = {
  name: string
  description: string
  amount: number // in naira (will be converted to kobo)
  currency: string
  interval: string
  trialDays: number
  retryAttempts: number
  retryIntervalDays: number
}

export async function getPlansWithStats() {
  const userId = await getUserId()

  const plans = await db
    .select()
    .from(plan)
    .where(eq(plan.userId, userId))
    .orderBy(desc(plan.createdAt))

  // Aggregate subscriber counts + MRR per plan (active subscribers only).
  const stats = await db
    .select({
      planId: subscriber.planId,
      subscriberCount: sql<number>`count(*)::int`,
      totalMrr: sql<number>`coalesce(sum(${subscriber.mrr}), 0)::bigint`,
    })
    .from(subscriber)
    .where(and(eq(subscriber.userId, userId), eq(subscriber.status, "active")))
    .groupBy(subscriber.planId)

  const statMap = new Map(stats.map((s) => [s.planId, s]))

  return plans.map((p) => {
    const s = statMap.get(p.id)
    return {
      ...p,
      subscriberCount: Number(s?.subscriberCount ?? 0),
      totalMrr: Number(s?.totalMrr ?? 0),
    }
  })
}

export async function createPlan(input: PlanInput) {
  const userId = await getUserId()
  await db.insert(plan).values({
    userId,
    name: input.name,
    description: input.description,
    amount: Math.round(input.amount * 100),
    currency: input.currency,
    interval: input.interval,
    trialDays: input.trialDays,
    retryAttempts: input.retryAttempts,
    retryIntervalDays: input.retryIntervalDays,
  })
  revalidatePath("/plans")
}
