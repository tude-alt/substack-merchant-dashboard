import { PageHeader } from "@/components/page-header"
import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { FailedPaymentsTable } from "@/components/dashboard/failed-payments-table"
import { getDashboardData } from "@/app/actions/dashboard"
import { getFailedPayments } from "@/app/actions/transactions"

export default async function DashboardPage() {
  const [data, failed] = await Promise.all([
    getDashboardData(),
    getFailedPayments(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="An overview of your recurring revenue and billing health."
      />

      <KpiStrip data={data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={data.revenueSeries} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed items={data.activity} />
        </div>
      </div>

      <FailedPaymentsTable
        rows={failed.map((f) => ({
          id: f.id,
          customerName: f.customerName,
          planName: f.planName,
          amount: f.amount,
          failureReason: f.failureReason,
          retryCount: f.retryCount,
          nextRetryDate: f.nextRetryDate,
        }))}
      />
    </div>
  )
}
