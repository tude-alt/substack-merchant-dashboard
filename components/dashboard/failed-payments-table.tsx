"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNaira, formatDate } from "@/lib/format"
import { retryCharge, cancelCharge } from "@/app/actions/transactions"
import { RefreshCw, X, CheckCircle2, Undo2 } from "lucide-react"

type FailedTx = {
  id: number
  customerName: string
  planName: string
  amount: number
  failureReason: string | null
  retryCount: number
  nextRetryDate: Date | null
}

type PendingAction = {
  id: number
  kind: "retry" | "cancel"
  timer: ReturnType<typeof setTimeout>
}

export function FailedPaymentsTable({ rows }: { rows: FailedTx[] }) {
  const [isPending, startTransition] = useTransition()
  // Rows currently in the "undo" window (optimistically hidden).
  const [pending, setPending] = useState<Record<number, PendingAction>>({})
  // Rows awaiting inline confirmation for cancel.
  const [confirming, setConfirming] = useState<number | null>(null)

  function commit(id: number, kind: "retry" | "cancel") {
    const timer = setTimeout(() => {
      startTransition(async () => {
        if (kind === "retry") await retryCharge(id)
        else await cancelCharge(id)
      })
      setPending((p) => {
        const next = { ...p }
        delete next[id]
        return next
      })
    }, 5000)
    setPending((p) => ({ ...p, [id]: { id, kind, timer } }))
    setConfirming(null)
  }

  function undo(id: number) {
    setPending((p) => {
      const action = p[id]
      if (action) clearTimeout(action.timer)
      const next = { ...p }
      delete next[id]
      return next
    })
  }

  const visible = rows.filter((r) => !pending[r.id])
  const pendingList = Object.values(pending)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Failed payments
          </h2>
          <p className="text-xs text-muted-foreground">
            Charges that need attention
          </p>
        </div>
      </div>

      {/* Undo banners */}
      {pendingList.map((a) => {
        const row = rows.find((r) => r.id === a.id)
        if (!row) return null
        return (
          <div
            key={a.id}
            className="flex items-center justify-between border-b border-border bg-secondary px-5 py-2.5 text-sm"
          >
            <span className="text-secondary-foreground">
              {a.kind === "retry"
                ? `Retrying charge for ${row.customerName}…`
                : `Cancelling ${row.customerName}'s subscription…`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => undo(a.id)}
              className="h-7 gap-1.5 text-primary"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
          </div>
        )
      })}

      {visible.length === 0 && pendingList.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <CheckCircle2 className="mb-2 h-7 w-7 text-success" />
          <p className="text-sm font-medium text-foreground">
            No failed payments
          </p>
          <p className="text-xs text-muted-foreground">
            Every charge this period went through. Nice work.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead className="hidden sm:table-cell">Retries</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Next retry
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id} className="hover:bg-accent/40">
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {row.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.planName}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatNaira(row.amount)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {row.failureReason ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-foreground">
                      {row.retryCount}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {formatDate(row.nextRetryDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {confirming === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          Cancel?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7"
                          disabled={isPending}
                          onClick={() => commit(row.id, "cancel")}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => setConfirming(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1.5"
                          disabled={isPending}
                          onClick={() => commit(row.id, "retry")}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setConfirming(row.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
