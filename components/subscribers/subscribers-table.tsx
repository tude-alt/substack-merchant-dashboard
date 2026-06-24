"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { formatNaira, formatDate } from "@/lib/format"
import { getSubscriberHistory } from "@/app/actions/subscribers"
import { ChevronDown, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Subscriber = {
  id: number
  name: string
  email: string
  phone: string
  planName: string
  status: string
  billingDate: Date
  lastChargeResult: string
  mrr: number
}

type HistoryRow = {
  id: number
  amount: number
  status: string
  nombaRef: string
  failureReason: string | null
  createdAt: Date
}

function HistoryPanel({ rows, loading }: { rows: HistoryRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No billing history for this customer yet.
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Amount</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="hidden text-xs sm:table-cell">
              Reference
            </TableHead>
            <TableHead className="hidden text-xs md:table-cell">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
              <TableCell className="text-sm font-medium">
                {formatNaira(r.amount)}
              </TableCell>
              <TableCell>
                <StatusPill status={r.status} kind="charge" />
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                {r.nombaRef}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {r.failureReason ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function SubscribersTable({ subscribers }: { subscribers: Subscriber[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [historyCache, setHistoryCache] = useState<Record<number, HistoryRow[]>>(
    {},
  )
  const [, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  function toggle(id: number) {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!historyCache[id]) {
      setLoadingId(id)
      startTransition(async () => {
        const rows = await getSubscriberHistory(id)
        setHistoryCache((c) => ({ ...c, [id]: rows as HistoryRow[] }))
        setLoadingId(null)
      })
    }
  }

  if (subscribers.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <Users className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No subscribers yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          When customers subscribe to one of your plans, they&apos;ll appear
          here with their billing status and MRR contribution.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">
                Billing date
              </TableHead>
              <TableHead className="hidden sm:table-cell">Last charge</TableHead>
              <TableHead className="text-right">MRR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => {
              const isOpen = expanded === s.id
              return (
                <>
                  <TableRow
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className="cursor-pointer hover:bg-accent/40"
                    data-state={isOpen ? "open" : undefined}
                  >
                    <TableCell>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {s.planName}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={s.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatDate(s.billingDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill status={s.lastChargeResult} kind="charge" />
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatNaira(s.mrr)}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      <TableCell colSpan={7} className="p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                          <span className="text-muted-foreground">
                            Phone:{" "}
                            <span className="text-foreground">{s.phone}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Plan:{" "}
                            <span className="text-foreground">{s.planName}</span>
                          </span>
                        </div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Billing history
                        </p>
                        <HistoryPanel
                          rows={historyCache[s.id] ?? []}
                          loading={loadingId === s.id}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
