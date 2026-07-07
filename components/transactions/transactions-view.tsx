"use client"

import { useEffect, useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/status-pill"
import { getTransactions } from "@/app/actions/transactions"
import { formatNaira, formatDate } from "@/lib/format"
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react"

type Txn = {
  id: number
  customerName: string
  planName: string
  amount: number
  status: string
  nombaRef: string
  failureReason: string | null
  createdAt: Date | string
}

type Result = {
  rows: Txn[]
  total: number
  page: number
  pageCount: number
  pageSize: number
}

export function TransactionsView({ initial }: { initial: Result }) {
  const [result, setResult] = useState<Result>(initial)
  const [status, setStatus] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(true)

  // Refetch when filters/page change (skip the very first render — we have initial data).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    setLoaded(false)
    startTransition(async () => {
      const data = await getTransactions({ status, from, to, page })
      setResult(data)
      setLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to, page])

  function resetToFirstPage(fn: () => void) {
    fn()
    setPage(1)
  }

  const rows = result.rows

  return (
    <Card className="overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => resetToFirstPage(() => setStatus(v))}
            >
              <SelectTrigger id="status-filter" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="successful">Successful</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from-date" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => resetToFirstPage(() => setFrom(e.target.value))}
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-date" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => resetToFirstPage(() => setTo(e.target.value))}
              className="w-full sm:w-40"
            />
          </div>
        </div>
        {(status !== "all" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              resetToFirstPage(() => {
                setStatus("all")
                setFrom("")
                setTo("")
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Plan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Reference</TableHead>
              <TableHead className="hidden lg:table-cell">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loaded || isPending ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Receipt className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      No transactions match these filters
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
                      Try widening your date range or clearing the status filter
                      to see more charges.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/40">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(t.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div>{t.customerName}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{t.planName}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {t.planName}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-foreground">
                    {formatNaira(t.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={t.status} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {t.nombaRef}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {t.failureReason ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          {result.total === 0
            ? "0 transactions"
            : `Page ${result.page} of ${result.pageCount} · ${result.total} total`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || isPending}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page >= result.pageCount || isPending}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
