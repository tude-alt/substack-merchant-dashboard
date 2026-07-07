import { db } from "@/lib/db"
import { coupon } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"

export async function validateCoupon(
  userId: string,
  code: string,
  planId: number,
  amountKobo: number,
): Promise<{ valid: true; discountedAmount: number; code: string } | { valid: false; reason: string }> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { valid: false, reason: "Coupon code is required." }

  const [row] = await db
    .select()
    .from(coupon)
    .where(
      and(
        eq(coupon.userId, userId),
        sql`upper(${coupon.code}) = ${normalized}`,
        eq(coupon.active, true),
      ),
    )
    .limit(1)

  if (!row) return { valid: false, reason: "Invalid or expired coupon." }
  if (row.planId && row.planId !== planId) {
    return { valid: false, reason: "This coupon does not apply to the selected plan." }
  }

  let discounted = amountKobo
  if (row.percentOff > 0) {
    discounted = Math.round(amountKobo * (1 - row.percentOff / 100))
  } else if (row.amountOff > 0) {
    discounted = Math.max(0, amountKobo - row.amountOff)
  }

  return { valid: true, discountedAmount: discounted, code: row.code }
}

export async function listCouponsForUser(userId: string) {
  return db
    .select()
    .from(coupon)
    .where(eq(coupon.userId, userId))
    .orderBy(coupon.createdAt)
}
