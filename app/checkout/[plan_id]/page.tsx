import { notFound } from "next/navigation"
import { HostedCheckoutForm } from "@/components/checkout/hosted-checkout-form"
import { getHostedCheckoutPlan } from "@/lib/checkout"
import { formatNaira } from "@/lib/format"
import { Logo } from "@/components/logo"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ plan_id: string }>
  searchParams: Promise<{ email?: string; name?: string; phone?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { plan_id } = await params
  const planId = Number(plan_id)
  if (!Number.isInteger(planId) || planId <= 0) {
    return { title: "Checkout — Subflow" }
  }
  const plan = await getHostedCheckoutPlan(planId)
  return {
    title: plan ? `Subscribe to ${plan.name}` : "Checkout — Subflow",
  }
}

export default async function HostedCheckoutPage({ params, searchParams }: PageProps) {
  const { plan_id } = await params
  const query = await searchParams
  const planId = Number(plan_id)

  if (!Number.isInteger(planId) || planId <= 0) {
    notFound()
  }

  const plan = await getHostedCheckoutPlan(planId)
  if (!plan) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <Logo />
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-10">
        <HostedCheckoutForm
          planId={plan.id}
          planName={plan.name}
          amountLabel={formatNaira(plan.amount)}
          interval={plan.interval}
          businessName={plan.businessName}
          defaultName={query.name ?? ""}
          defaultEmail={query.email ?? ""}
          defaultPhone={query.phone ?? ""}
        />
      </div>
    </div>
  )
}
