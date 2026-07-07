import Link from "next/link"
import { Logo } from "@/components/logo"
import { CheckCircle2, AlertCircle } from "lucide-react"

async function getStatus() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${base}/api/status`, { cache: "no-store" })
    return res.json()
  } catch {
    return { status: "degraded", services: [] }
  }
}

export default async function StatusPage() {
  const data = await getStatus()
  const operational = data.status === "operational"

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex items-center gap-3">
          {operational ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-amber-600" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subflow status</h1>
            <p className="text-sm capitalize text-muted-foreground">{data.status}</p>
          </div>
        </div>

        <ul className="mt-8 space-y-3">
          {(data.services ?? []).map((s: { name: string; status: string }) => (
            <li
              key={s.name}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="font-medium text-foreground">{s.name}</span>
              <span
                className={`text-sm capitalize ${s.status === "operational" ? "text-emerald-600" : "text-amber-600"}`}
              >
                {s.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
