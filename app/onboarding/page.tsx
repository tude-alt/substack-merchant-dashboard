import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getAppUrl } from "@/lib/billing"
import { SetupWizard } from "@/components/setup-wizard"
import { Logo } from "@/components/logo"

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const merchant = await getMerchant()
  if (merchant.onboardingComplete) redirect("/dashboard")

  return (
    <main className="min-h-dvh bg-mesh">
      <header className="border-b border-border/60 glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-center px-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 lg:py-14">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Quick setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
            Let&apos;s get you ready to charge
          </h1>
          <p className="text-muted-foreground text-pretty">
            We&apos;ll create your plans, API keys, and monitoring — you&apos;ll have a checkout
            link and code snippet when we&apos;re done.
          </p>
        </div>
        <SetupWizard
          initialBusinessName={merchant.businessName}
          initialCategory={merchant.category}
          nombaWebhookUrl={`${getAppUrl()}/api/webhooks/nomba`}
        />
      </div>
    </main>
  )
}
