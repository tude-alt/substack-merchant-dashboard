import { getPlansWithStats } from "@/app/actions/plans"
import { PlansView } from "@/components/plans/plans-view"

export default async function PlansPage() {
  const plans = await getPlansWithStats()

  return <PlansView plans={plans} />
}
