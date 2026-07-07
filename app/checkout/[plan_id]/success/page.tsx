import Link from "next/link"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { confirmInitialPaymentByOrderReference } from "@/lib/confirm-payment"

type PageProps = {
  searchParams: Promise<{ ref?: string; orderReference?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams
  // Nomba appends `orderReference` on redirect; we also set `ref` on the callback URL.
  const orderRef = query.ref?.trim() || query.orderReference?.trim()

  let title = "Confirming your payment"
  let message =
    "Step 2 complete — we're verifying your card payment with Nomba. This usually takes a few seconds."
  let tone: "success" | "pending" | "neutral" = "pending"
  let Icon = Clock

  if (ref?.trim()) {
    const result = await confirmInitialPaymentByOrderReference(ref.trim())
    switch (result.status) {
      case "activated":
        title = "Payment successful — you're subscribed!"
        message =
          "Your card payment was confirmed and your subscription is now active. Your merchant's dashboard has been updated."
        tone = "success"
        Icon = CheckCircle2
        break
      case "already_active":
        title = "You're subscribed!"
        message = "Your subscription is already active. You can close this page."
        tone = "success"
        Icon = CheckCircle2
        break
      case "not_paid":
        title = "Payment pending"
        message =
          result.reason ||
          "We haven't received confirmation from Nomba yet. If you just paid, wait a moment and refresh — or check your email for next steps from your merchant."
        tone = "pending"
        Icon = Clock
        break
      case "not_found":
        title = "Subscription not found"
        message =
          "We couldn't match this payment to a subscription. Contact your merchant if you were charged."
        tone = "neutral"
        Icon = AlertCircle
        break
    }
  } else {
    title = "Thanks!"
    message =
      "If you completed payment, your merchant will confirm your subscription shortly. Check your email for updates."
    tone = "neutral"
    Icon = CheckCircle2
  }

  const iconWrap =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-600"
      : tone === "pending"
        ? "bg-amber-500/15 text-amber-600"
        : "bg-muted text-muted-foreground"

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <Logo />
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elevated">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconWrap}`}
          >
            <Icon className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            {message}
          </p>
          {ref && tone === "pending" && (
            <p className="mt-4 text-xs text-muted-foreground">
              Reference: <code className="font-mono">{ref}</code>
            </p>
          )}
          <Button asChild variant="outline" className="mt-8">
            <Link href="/">Done</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
