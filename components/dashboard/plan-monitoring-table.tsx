import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNaira, formatPercent } from "@/lib/format"
import type { PlanMonitoringRow } from "@/lib/monitoring"

export function PlanMonitoringTable({ rows }: { rows: PlanMonitoringRow[] }) {
  if (rows.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-foreground">Per-plan monitoring</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          MRR, churn, and failed charge rates by plan — updates automatically.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Active subs</TableHead>
              <TableHead>Churn (30d)</TableHead>
              <TableHead>Failed charges (7d)</TableHead>
              <TableHead>MRR trend (30d)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.planId}>
                <TableCell className="font-medium">{row.planName}</TableCell>
                <TableCell>{formatNaira(row.mrr)}</TableCell>
                <TableCell>{row.activeSubscribers}</TableCell>
                <TableCell
                  className={
                    row.churnRate30d > 10 ? "text-destructive font-medium" : "text-muted-foreground"
                  }
                >
                  {formatPercent(row.churnRate30d)}
                </TableCell>
                <TableCell
                  className={
                    row.failedChargeRate7d > 15
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {formatPercent(row.failedChargeRate7d)}
                </TableCell>
                <TableCell>
                  <MiniSparkline points={row.mrrTrend} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function MiniSparkline({ points }: { points: { date: string; mrr: number }[] }) {
  if (points.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const values = points.map((p) => p.mrr)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 80
  const h = 24

  const coords = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={w} height={h} className="text-primary" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  )
}
