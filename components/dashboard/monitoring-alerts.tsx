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
          className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <p className="text-foreground">{alert.message}</p>
        </div>
      ))}
    </div>
  )
}
