"use server"

import { db } from "@/lib/db"
import { transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { formatNaira, formatDate } from "@/lib/format"
import { desc, eq } from "drizzle-orm"

export async function exportTransactionsCsv(): Promise<string> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(desc(transaction.createdAt))

  const header = "Date,Customer,Plan,Amount,Status,Reference,Failure Reason"
  const lines = rows.map((r) =>
    [
      formatDate(r.createdAt),
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.planName.replace(/"/g, '""')}"`,
      formatNaira(r.amount),
      r.status,
      r.nombaRef,
      `"${(r.failureReason ?? "").replace(/"/g, '""')}"`,
    ].join(","),
  )

  return [header, ...lines].join("\n")
}
