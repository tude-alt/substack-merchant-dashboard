import { db } from "@/lib/db"
import { apiIdempotency } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function getIdempotentResponse(userId: string, idempotencyKey: string) {
  const [row] = await db
    .select()
    .from(apiIdempotency)
    .where(
      and(eq(apiIdempotency.userId, userId), eq(apiIdempotency.idempotencyKey, idempotencyKey)),
    )
    .limit(1)
  return row ?? null
}

export async function storeIdempotentResponse(
  userId: string,
  idempotencyKey: string,
  statusCode: number,
  responseBody: string,
) {
  await db
    .insert(apiIdempotency)
    .values({ userId, idempotencyKey, statusCode, responseBody })
    .onConflictDoNothing({
      target: [apiIdempotency.userId, apiIdempotency.idempotencyKey],
    })
}
