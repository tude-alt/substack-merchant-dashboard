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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{formatDate(label)}</p>
      <p className="font-semibold text-popover-foreground">
        {formatNaira(payload[0].value)}
      </p>
    </div>
  )
}

export function RevenueChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Revenue — last 30 days
          </h2>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {formatNaira(total)}
          </p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v)
                return `${d.getDate()}`
              }}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v) => {
                // v is in kobo; convert to naira and show compact.
                const naira = v / 100
                if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`
                if (naira >= 1_000) return `₦${Math.round(naira / 1000)}k`
                return `₦${naira}`
              }}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
