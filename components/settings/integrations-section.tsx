"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiKeysSection } from "@/components/settings/api-keys-section"
import {
  regenerateWebhookSecret,
  saveWebhookConfig,
} from "@/app/actions/merchant"
import { replayWebhookDelivery, sendTestWebhook } from "@/app/actions/webhooks"
import { formatDateTime, formatNaira } from "@/lib/format"
import {
  PlugZap,
  Send,
  Check,
  AlertCircle,
  Radio,
  Copy,
  RefreshCw,
  BookOpen,
} from "lucide-react"

const EVENTS = [
  "subscription.created",
  "charge.success",
  "charge.failed",
  "charge.retried",
  "subscription.cancelled",
]

type PlanOption = { id: number; name: string; amount: number; interval: string }

type Delivery = {
  id: number
  endpoint: string
  event: string
  statusCode: number
  responseTimeMs: number
  attempt: number
  error: string | null
  createdAt: Date | string
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

export function IntegrationsSection({
  liveApiKey,
  testApiKey,
  webhookSecret,
  webhookUrl,
  selectedEvents,
  nombaWebhookUrl,
  plans,
  deliveries,
}: {
  liveApiKey: string
  testApiKey: string
  webhookSecret: string
  webhookUrl: string
  selectedEvents: string[]
  nombaWebhookUrl: string
  plans: PlanOption[]
  deliveries: Delivery[]
}) {
  const router = useRouter()
  const [url, setUrl] = useState(webhookUrl)
  const [events, setEvents] = useState<string[]>(selectedEvents)
  const [secret, setSecret] = useState(webhookSecret)
  const [selectedPlanId, setSelectedPlanId] = useState(
    plans[0] ? String(plans[0].id) : "",
  )
  const [savePending, startSave] = useTransition()
  const [testPending, startTest] = useTransition()
  const [secretPending, startSecret] = useTransition()
  const [banner, setBanner] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null)
  const [saved, setSaved] = useState(false)

  const selectedPlan = plans.find((p) => String(p.id) === selectedPlanId)

  function toggleEvent(ev: string, checked: boolean) {
    setEvents((prev) =>
      checked ? [...prev, ev] : prev.filter((e) => e !== ev),
    )
  }

  function save() {
    startSave(async () => {
      await saveWebhookConfig({ webhookUrl: url.trim(), events })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    })
  }

  function test() {
    setBanner(null)
    startTest(async () => {
      const res = await sendTestWebhook()
      if (!("statusCode" in res)) {
        setBanner({ kind: "error", text: res.error })
      } else if (res.delivered) {
        setBanner({
          kind: "success",
          text: `Delivered — your endpoint responded ${res.statusCode} in ${res.responseTimeMs}ms (attempt ${res.attempts}).`,
        })
      } else if (res.statusCode === 0) {
        setBanner({
          kind: "error",
          text: `Delivery failed after ${res.attempts} attempts — no HTTP response (${res.error ?? "network error"}).`,
        })
      } else {
        setBanner({
          kind: "error",
          text: `Delivery failed after ${res.attempts} attempts — endpoint responded ${res.statusCode}.`,
        })
      }
      router.refresh()
    })
  }

  function rotateSecret() {
    startSecret(async () => {
      const next = await regenerateWebhookSecret()
      setSecret(next)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/15 p-2">
              <PlugZap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-muted-foreground">
                API keys, plan IDs, webhook URL, and delivery testing.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
            <Link href="/dashboard/docs">
              <BookOpen className="h-4 w-4" />
              Guides
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-foreground">Nomba inbound webhook (required for live payments)</p>
            <p className="mt-1 text-muted-foreground">
              Register this URL in your Nomba developer dashboard so Subflow is notified when
              customers pay. Without it, use <strong>Verify payment</strong> on pending subscribers
              or rely on the hosted checkout success page.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
                {nombaWebhookUrl}
              </code>
              <CopyButton value={nombaWebhookUrl} label="Copy Nomba webhook URL" />
            </div>
          </div>

          <ApiKeysSection liveApiKey={liveApiKey} testApiKey={testApiKey} embedded />

          <div className="space-y-2 border-t border-border pt-5">
            <Label className="text-sm text-foreground">Plan for your app</Label>
            <p className="text-sm text-muted-foreground">
              Copy a plan ID into{" "}
              <code className="font-mono text-xs">SUBFLOW_CARE_PLAN_ID</code> (or your own env var).
            </p>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans yet.{" "}
                <Link href="/dashboard/plans" className="text-primary underline-offset-4 hover:underline">
                  Create a plan
                </Link>{" "}
                first.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="sm:max-w-md">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        #{p.id} — {p.name} ({formatNaira(p.amount)} / {p.interval})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlan && (
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                      {selectedPlan.id}
                    </code>
                    <CopyButton value={String(selectedPlan.id)} label="Copy plan ID" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <Label htmlFor="webhook-secret" className="text-sm text-foreground">
              Webhook secret
            </Label>
            <p className="text-sm text-muted-foreground">
              Set as{" "}
              <code className="font-mono text-xs">SUBFLOW_WEBHOOK_SECRET</code> to verify{" "}
              <code className="font-mono text-xs">X-Subflow-Signature</code> (HMAC-SHA256 hex of raw body).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code
                id="webhook-secret"
                className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm"
              >
                {secret}
              </code>
              <div className="flex gap-2">
                <CopyButton value={secret} label="Copy webhook secret" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={rotateSecret}
                  disabled={secretPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {secretPending ? "Rotating…" : "Rotate"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <Label htmlFor="webhook-url" className="text-sm text-foreground">
              Webhook endpoint URL
            </Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://api.yourapp.com/webhooks/subflow"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-foreground">Events to send</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EVENTS.map((ev) => (
                <label
                  key={ev}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    checked={events.includes(ev)}
                    onCheckedChange={(c) => toggleEvent(ev, Boolean(c))}
                  />
                  <code className="font-mono text-xs text-foreground">{ev}</code>
                </label>
              ))}
            </div>
          </div>

          {banner && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                banner.kind === "success"
                  ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {banner.kind === "success" ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{banner.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={savePending}>
              {saved ? "Saved" : savePending ? "Saving…" : "Save configuration"}
            </Button>
            <Button
              variant="outline"
              onClick={test}
              disabled={testPending}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {testPending ? "Testing…" : "Test connection"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Also available as{" "}
              <code className="font-mono">POST /api/v1/webhooks/test</code>
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-medium text-foreground">Recent webhook deliveries</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Radio className="mb-2 h-7 w-7 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">No deliveries yet</p>
                        <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
                          Run Test connection above to verify your endpoint.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveries.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/40">
                      <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                        {d.endpoint}
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs text-foreground">{d.event}</code>
                      </TableCell>
                      <TableCell>
                        <span
                          title={d.error ?? undefined}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.statusCode >= 200 && d.statusCode < 300
                              ? "bg-[var(--success)]/15 text-[var(--success)]"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {d.statusCode === 0 ? "no response" : d.statusCode}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        #{d.attempt}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {d.responseTimeMs}ms
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            startSave(async () => {
                              const res = await replayWebhookDelivery(d.id)
                              setBanner(
                                res.ok
                                  ? {
                                      kind: "success",
                                      text: `Replayed — endpoint responded ${res.statusCode}.`,
                                    }
                                  : { kind: "error", text: res.error },
                              )
                              router.refresh()
                            })
                          }
                        >
                          Replay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  )
}
