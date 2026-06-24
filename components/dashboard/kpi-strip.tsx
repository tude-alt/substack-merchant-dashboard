import { Card } from "@/components/ui/card"
import { formatNaira, formatPercent } from "@/lib/format"
import { TrendingUp, Users, AlertTriangle, Activity } from "lucide-react"
import type { DashboardData } from "@/app/actions/dashboard"

export function KpiStrip({ data }: { data: DashboardData }) {
  const items = [
    {
      label: "MRR",
      value: formatNaira(data.mrr),
      icon: TrendingUp,
      tone: "text-primary",
    },
    {
      label: "Active Subscribers",
      value: data.activeSubscribers.toLocaleString("en-NG"),
      icon: Users,
      tone: "text-foreground",
    },
    {
      label: "Failed Charges This Month",
      value: data.failedThisMonth.toLocaleString("en-NG"),
      icon: AlertTriangle,
      tone: "text-destructive",
    },
    {
      label: "Churn Rate",
      value: formatPercent(data.churnRate),
      icon: Activity,
      tone: "text-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              <Icon className={`h-4 w-4 ${item.tone}`} />
            </div>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.tone}`}>
              {item.value}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
