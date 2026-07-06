import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-full bg-[var(--success)]/15 p-4">
          <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">You&apos;re subscribed!</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Your subscription has been set up. If payment is still pending, check your email for
          next steps.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
