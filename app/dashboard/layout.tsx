import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMerchant } from "@/app/actions/merchant"
import { Sidebar, MobileTopBar, BottomNav } from "@/components/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const merchant = await getMerchant()
  if (!merchant.onboardingComplete) redirect("/onboarding")

  const merchantName = merchant.businessName || session.user.name || "Merchant"

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar merchantName={merchantName} email={session.user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="relative flex-1 bg-dot-grid px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="pointer-events-none absolute inset-0 bg-mesh opacity-50" />
          <div className="relative mx-auto max-w-7xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
