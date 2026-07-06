"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PlanFormFields,
  emptyPlanForm,
  type PlanFormState,
} from "@/components/plan-form-fields"
import { PageHeader } from "@/components/page-header"
import { createPlan } from "@/app/actions/plans"
import { formatNaira } from "@/lib/format"
import { Plus, Layers, Users, AlertCircle, Copy, Check } from "lucide-react"

type PlanCard = {
  id: number
  name: string
  description: string
  amount: number
  interval: string
  subscriberCount: number
  totalMrr: number
}

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
}

function CopyPlanIdButton({ planId }: { planId: number }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Copy plan ID"
      onClick={() => {
        navigator.clipboard.writeText(String(planId))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

export function PlansView({ plans }: { plans: PlanCard[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm)
  const [error, setError] = useState<string | null>(null)
  const [createdPlanId, setCreatedPlanId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!form.name.trim() || !form.amount) {
      setError("Please provide a plan name and amount.")
      return
    }
    setError(null)
    startTransition(async () => {
      const created = await createPlan({
        name: form.name.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        interval: form.interval,
        trialDays: Number(form.trialDays) || 0,
        retryAttempts: Number(form.retryAttempts) || 0,
        retryIntervalDays: Number(form.retryIntervalDays) || 1,
      })
      setForm(emptyPlanForm)
      setOpen(false)
      setCreatedPlanId(created.id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Plans"
          description="Billing plans your customers can subscribe to. Use the plan ID in your API integration."
          action={
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          }
        />

        {createdPlanId !== null && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-foreground">
              Use this ID as{" "}
              <code className="font-mono text-xs">SUBFLOW_CARE_PLAN_ID</code> in your app:{" "}
              <strong className="font-mono">{createdPlanId}</strong>
            </span>
            <CopyPlanIdButton planId={createdPlanId} />
          </div>
        )}

        {plans.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Layers className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No plans yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
              Create your first billing plan to start charging customers on a recurring schedule.
            </p>
            <Button onClick={() => setOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create a plan
            </Button>
          </Card>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Plan ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Interval</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Active subs</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm font-medium text-foreground">
                              {p.id}
                            </code>
                            <CopyPlanIdButton planId={p.id} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            {p.description && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {INTERVAL_LABEL[p.interval] ?? p.interval}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatNaira(p.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {p.subscriberCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatNaira(p.totalMrr)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <Card key={`card-${p.id}`} className="flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">ID {p.id}</p>
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {INTERVAL_LABEL[p.interval] ?? p.interval}
                      </span>
                    </div>
                    <div className="rounded-md bg-primary/15 p-2">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    {formatNaira(p.amount)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {p.interval === "monthly"
                        ? " /mo"
                        : p.interval === "quarterly"
                          ? " /qtr"
                          : " /yr"}
                    </span>
                  </p>

                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground text-pretty">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {p.subscriberCount} active
                    </span>
                    <span className="font-medium text-foreground">
                      {formatNaira(p.totalMrr)} MRR
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create a new plan</SheetTitle>
            <SheetDescription>
              Define pricing, billing interval, and retry behaviour. The plan ID is shown after creation.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <PlanFormFields value={form} onChange={setForm} />
          </div>

          <SheetFooter>
            <Button onClick={submit} disabled={isPending} className="w-full">
              {isPending ? "Creating…" : "Create plan"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
