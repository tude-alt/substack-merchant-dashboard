import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { merchant, plan, subscriber } from "@/lib/db/schema"
import { formatNaira, formatDate } from "@/lib/format"
import { cancelSubscriberFromPortal } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/status-pill"
import { Logo } from "@/components/logo"
import { eq } from "drizzle-orm"

type PageProps = { params: Promise<{ token: string }> }

export default async function CustomerPortalPage({ params }: PageProps) {
  const { token } = await params

  const [sub] = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.portalToken, token))
    .limit(1)

  if (!sub) notFound()

  const [m] = await db
    .select()
    .from(merchant)
    .where(eq(merchant.userId, sub.userId))
    .limit(1)

  const [p] = sub.planId
    ? await db.select().from(plan).where(eq(plan.id, sub.planId)).limit(1)
    : [undefined]

  const cancelAction = cancelSubscriberFromPortal.bind(null, token)

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          {m?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.logoUrl} alt={m.businessName} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <Logo />
          )}
          <span className="text-sm text-muted-foreground">{m?.businessName}</span>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Your subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage billing for {sub.email}</p>

        <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{sub.planName}</p>
              <p className="text-sm text-muted-foreground">
                {p ? formatNaira(p.amount) : "—"} / {p?.interval ?? "month"}
              </p>
            </div>
            <StatusPill status={sub.status} />
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>
              Next billing:{" "}
              <span className="text-foreground">{formatDate(sub.billingDate)}</span>
            </p>
            <p>
              Last charge:{" "}
              <StatusPill status={sub.lastChargeResult} kind="charge" />
            </p>
          </div>

          {sub.status === "pending_payment" && sub.checkoutLink && (
            <Button asChild className="w-full">
              <a href={sub.checkoutLink}>Complete payment</a>
            </Button>
          )}

          {sub.status !== "cancelled" && (
            <form action={cancelAction}>
              <Button type="submit" variant="outline" className="w-full">
                Cancel subscription
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by <Link href="/" className="text-primary hover:underline">Subflow</Link>
        </p>
      </div>
    </div>
  )
}
