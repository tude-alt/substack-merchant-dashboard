import { getPlansWithStats } from "@/app/actions/plans"
import { PlansView } from "@/components/plans/plans-view"
import { buildHostedCheckoutUrl } from "@/lib/checkout"

export default async function PlansPage() {
  const plans = await getPlansWithStats()

  const plansWithCheckout = plans.map((p) => ({
    ...p,
    checkoutUrl: buildHostedCheckoutUrl(p.id),
  }))

  return <PlansView plans={plansWithCheckout} />
}
