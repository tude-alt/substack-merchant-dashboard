import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"

export type MerchantAuth = {
  merchant: typeof merchant.$inferSelect
  mode: "live" | "test"
}

/**
 * Public merchant API auth. Bearer sk_live_* or sk_test_* checked against Postgres.
 */
export async function authenticateMerchant(
  request: Request,
): Promise<MerchantAuth | null> {
  const header = request.headers.get("authorization") ?? ""
  const match = header.match(/^Bearer\s+(sk_(?:live|test)_[a-z0-9]+)$/i)
  if (!match) return null
  const key = match[1]
  const [m] = await db
    .select()
    .from(merchant)
    .where(or(eq(merchant.liveApiKey, key), eq(merchant.testApiKey, key)))
    .limit(1)
  if (!m) return null
  return { merchant: m, mode: key === m.liveApiKey ? "live" : "test" }
}
