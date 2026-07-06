import "server-only"

import { db } from "@/lib/db"
import { merchant, plan } from "@/lib/db/schema"
import { getAppUrl } from "@/lib/billing"
import { eq } from "drizzle-orm"

export type HostedCheckoutPlan = {
  id: number
  name: string
  description: string
  amount: number
  currency: string
  interval: string
  successRedirectUrl: string
  businessName: string
}

export async function getHostedCheckoutPlan(
  planId: number,
): Promise<HostedCheckoutPlan | null> {
  const [row] = await db
    .select({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      successRedirectUrl: plan.successRedirectUrl,
      businessName: merchant.businessName,
    })
    .from(plan)
    .innerJoin(merchant, eq(merchant.userId, plan.userId))
    .where(eq(plan.id, planId))
    .limit(1)

  if (!row) return null
  return row
}

export async function getMerchantForPlan(planId: number) {
  const [row] = await db
    .select({ merchant, planUserId: plan.userId })
    .from(plan)
    .innerJoin(merchant, eq(merchant.userId, plan.userId))
    .where(eq(plan.id, planId))
    .limit(1)

  return row ?? null
}

export function buildHostedCheckoutUrl(
  planId: number,
  query?: { email?: string; name?: string; phone?: string },
): string {
  const url = new URL(`${getAppUrl()}/checkout/${planId}`)
  if (query?.email) url.searchParams.set("email", query.email)
  if (query?.name) url.searchParams.set("name", query.name)
  if (query?.phone) url.searchParams.set("phone", query.phone)
  return url.toString()
}

export function hostedCheckoutConfirmationUrl(planId: number): string {
  return `${getAppUrl()}/checkout/${planId}/success`
}
