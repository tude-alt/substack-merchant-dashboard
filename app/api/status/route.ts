import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const checks: { name: string; status: "operational" | "degraded" }[] = []

  try {
    await db.execute(sql`select 1`)
    checks.push({ name: "Database", status: "operational" })
  } catch {
    checks.push({ name: "Database", status: "degraded" })
  }

  checks.push({
    name: "API",
    status: "operational",
  })

  checks.push({
    name: "Nomba payments",
    status: process.env.NOMBA_CLIENT_ID ? "operational" : "degraded",
  })

  const overall = checks.every((c) => c.status === "operational")
    ? "operational"
    : "degraded"

  return Response.json({
    status: overall,
    updated_at: new Date().toISOString(),
    services: checks,
  })
}
