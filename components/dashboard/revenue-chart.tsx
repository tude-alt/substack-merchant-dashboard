"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/components/ui/card"
import { formatNaira, formatDate } from "@/lib/format"

type Point = { date: string; revenue: number }

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-elevated">
      <p className="text-xs text-muted-foreground">{formatDate(label)}</p>
      <p className="font-bold text-popover-foreground">{formatNaira(payload[0].value)}</p>
    </div>
  )
}

export function RevenueChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card className="border-border/80 p-0 shadow-card ring-0">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Revenue
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatNaira(total)}
          </p>
          <span className="text-xs text-muted-foreground">last 30 days</span>
        </div>
      </div>
      <div className="h-64 w-full p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v)
                return `${d.getDate()}`
              }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v) => {
                const naira = v / 100
                if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`
                if (naira >= 1_000) return `₦${Math.round(naira / 1000)}k`
                return `₦${naira}`
              }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
