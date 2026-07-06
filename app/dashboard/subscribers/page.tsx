import { PageHeader } from "@/components/page-header"
import { SubscribersTable } from "@/components/subscribers/subscribers-table"
import { getSubscribers } from "@/app/actions/subscribers"

export default async function SubscribersPage() {
  const subscribers = await getSubscribers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscribers"
        description={`${subscribers.length} customer${subscribers.length === 1 ? "" : "s"} across your billing plans.`}
      />
      <SubscribersTable
        subscribers={subscribers.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          planName: s.planName,
          status: s.status,
          billingDate: s.billingDate,
          lastChargeResult: s.lastChargeResult,
          mrr: s.mrr,
          hasTokenizedCard: Boolean(s.nombaTokenKey),
          checkoutLink: s.checkoutLink,
        }))}
      />
    </div>
  )
}
