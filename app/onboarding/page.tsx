import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMerchant } from "@/app/actions/merchant"
import { SetupWizard } from "@/components/setup-wizard"
import { Logo } from "@/components/logo"

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const merchant = await getMerchant()
  if (merchant.onboardingComplete) redirect("/dashboard")

  return (
    <main className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-center border-b border-border">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
      </header>
      <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-10">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            Set up Subflow in minutes
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Answer a few questions — we&apos;ll create your plans, API keys, and monitoring
            automatically.
          </p>
        </div>
        <SetupWizard
          initialBusinessName={merchant.businessName}
          initialCategory={merchant.category}
        />
      </div>
    </main>
  )
}
