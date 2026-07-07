import { AlertTriangle } from "lucide-react"
import type { MonitoringAlert } from "@/lib/monitoring"

export function MonitoringAlerts({ alerts }: { alerts: MonitoringAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={`${alert.planId}-${alert.type}`}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm shadow-card dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="pt-1 font-medium text-foreground">{alert.message}</p>
        </div>
      ))}
    </div>
  )
}
