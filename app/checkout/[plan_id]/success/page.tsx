import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <Logo />
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elevated">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">You&apos;re subscribed!</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Your subscription is set up. If payment is still pending, check your email for next
            steps from your merchant.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/">Done</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
