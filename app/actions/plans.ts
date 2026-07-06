"use server"

import { subscriber } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
  createPlanForUser,
  listPlansForUser,
  type PlanInput,
} from "@/lib/plans"

export type { PlanInput } from "@/lib/plans"

export async function getPlansWithStats() {
  const userId = await getUserId()

  const plans = await listPlansForUser(userId)

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
  const created = await createPlanForUser(userId, input)
  revalidatePath("/dashboard/plans")
  return { id: created.id, name: created.name }
}
