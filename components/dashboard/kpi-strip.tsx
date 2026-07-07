import { Card } from "@/components/ui/card"
import { formatNaira, formatPercent } from "@/lib/format"
import { TrendingUp, Users, AlertTriangle, Activity } from "lucide-react"
import type { DashboardData } from "@/app/actions/dashboard"
import { cn } from "@/lib/utils"

export function KpiStrip({ data }: { data: DashboardData }) {
  const items = [
    {
      label: "Monthly recurring revenue",
      short: "MRR",
      value: formatNaira(data.mrr),
      icon: TrendingUp,
      iconBg: "bg-primary/10 text-primary",
      valueClass: "text-primary",
    },
    {
      label: "Active subscribers",
      short: "Active",
      value: data.activeSubscribers.toLocaleString("en-NG"),
      icon: Users,
      iconBg: "bg-emerald-500/10 text-emerald-600",
      valueClass: "text-foreground",
    },
    {
      label: "Failed charges this month",
      short: "Failed",
      value: data.failedThisMonth.toLocaleString("en-NG"),
      icon: AlertTriangle,
      iconBg: "bg-destructive/10 text-destructive",
      valueClass: data.failedThisMonth > 0 ? "text-destructive" : "text-foreground",
    },
    {
      label: "Churn rate",
      short: "Churn",
      value: formatPercent(data.churnRate),
      icon: Activity,
      iconBg: "bg-amber-500/10 text-amber-600",
      valueClass: "text-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card
            key={item.label}
            className="overflow-hidden border-border/80 p-0 shadow-card ring-0"
          >
            <div className="p-4 lg:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground lg:hidden">
                    {item.short}
                  </p>
                  <p className="hidden text-xs font-medium text-muted-foreground lg:block">
                    {item.label}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    item.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className={cn("mt-3 text-2xl font-bold tracking-tight lg:text-3xl", item.valueClass)}>
                {item.value}
              </p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
