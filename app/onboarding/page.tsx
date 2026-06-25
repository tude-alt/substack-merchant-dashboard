import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMerchant } from "@/app/actions/merchant"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { Logo } from "@/components/logo"

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const merchant = await getMerchant()
  if (merchant.onboardingComplete) redirect("/")

  return (
    <main className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-center border-b border-border">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
      </header>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <OnboardingWizard
          initialBusinessName={merchant.businessName}
          initialCategory={merchant.category}
        />
      </div>
    </main>
  )
}
