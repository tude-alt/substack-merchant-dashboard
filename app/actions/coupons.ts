"use server"

import { db } from "@/lib/db"
import { coupon } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { listCouponsForUser } from "@/lib/coupons"
import { revalidatePath } from "next/cache"

export async function getCoupons() {
  const userId = await getUserId()
  return listCouponsForUser(userId)
}

export async function createCoupon(input: {
  code: string
  planId?: number
  percentOff: number
  amountOff: number
}) {
  const userId = await getUserId()
  const code = input.code.trim().toUpperCase()
  if (!code) return { ok: false as const, error: "Coupon code is required." }

  await db.insert(coupon).values({
    userId,
    code,
    planId: input.planId ?? null,
    percentOff: input.percentOff,
    amountOff: Math.round(input.amountOff * 100),
    active: true,
  })

  revalidatePath("/dashboard/settings")
  return { ok: true as const }
}
