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
import { RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react"

type FailedTx = {
  id: number
  customerName: string
  planName: string
  amount: number
  failureReason: string | null
  retryCount: number
  nextRetryDate: Date | null
}

export function FailedPaymentsTable({ rows }: { rows: FailedTx[] }) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [banner, setBanner] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null)

  function doRetry(row: FailedTx) {
    setBanner(null)
    setBusyId(row.id)
    startTransition(async () => {
      // Real Nomba charge attempt — the banner shows Nomba's actual outcome.
      const res = await retryCharge(row.id)
      if (res.ok) {
        setBanner({
          kind: "success",
          text: `Retry for ${row.customerName} ${res.status === "successful" ? "succeeded" : "accepted (pending confirmation)"} — Nomba ref ${res.nombaRef}`,
        })
      } else {
        setBanner({
          kind: "error",
          text: `Retry for ${row.customerName} failed: ${res.error}`,
        })
      }
      setBusyId(null)
    })
  }

  function doCancel(row: FailedTx) {
    setBanner(null)
    setBusyId(row.id)
    setConfirming(null)
    startTransition(async () => {
      await cancelCharge(row.id)
      setBanner({
        kind: "success",
        text: `Subscription cancelled for ${row.customerName}.`,
      })
      setBusyId(null)
    })
  }

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

      {banner && (
        <div
          role="alert"
          className={`flex items-start gap-2 border-b border-border px-5 py-2.5 text-sm ${
            banner.kind === "success" ? "text-success" : "text-destructive"
          }`}
        >
          {banner.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 break-words">{banner.text}</span>
        </div>
      )}

      {rows.length === 0 ? (
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
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
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
                  <TableCell className="hidden max-w-[280px] text-sm text-muted-foreground md:table-cell">
                    <span className="line-clamp-2">{row.failureReason ?? "—"}</span>
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
                          onClick={() => doCancel(row)}
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
                          onClick={() => doRetry(row)}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${busyId === row.id ? "animate-spin" : ""}`}
                          />
                          {busyId === row.id ? "Charging…" : "Retry"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1.5 text-destructive hover:text-destructive"
                          disabled={isPending}
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
