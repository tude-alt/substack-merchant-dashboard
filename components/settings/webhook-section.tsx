"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { saveWebhookConfig } from "@/app/actions/merchant"
import { sendTestWebhook } from "@/app/actions/webhooks"
import { formatDateTime } from "@/lib/format"
import { Webhook, Send, Check, AlertCircle, Radio } from "lucide-react"

const EVENTS = [
  "subscription.created",
  "charge.success",
  "charge.failed",
  "charge.retried",
  "subscription.cancelled",
]

type Delivery = {
  id: number
  endpoint: string
  event: string
  statusCode: number
  responseTimeMs: number
  createdAt: Date | string
}

export function WebhookSection({
  webhookUrl,
  selectedEvents,
  deliveries,
}: {
  webhookUrl: string
  selectedEvents: string[]
  deliveries: Delivery[]
}) {
  const router = useRouter()
  const [url, setUrl] = useState(webhookUrl)
  const [events, setEvents] = useState<string[]>(selectedEvents)
  const [savePending, startSave] = useTransition()
  const [testPending, startTest] = useTransition()
  const [banner, setBanner] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null)
  const [saved, setSaved] = useState(false)

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
      if (!res.ok && "error" in res && res.error) {
        setBanner({ kind: "error", text: res.error })
      } else if (res.ok) {
        setBanner({
          kind: "success",
          text: `Test event delivered — 200 OK in ${res.responseTimeMs}ms.`,
        })
      } else {
        setBanner({
          kind: "error",
          text: `Endpoint responded with ${res.statusCode}. Check your handler.`,
        })
      }
      router.refresh()
    })
  }

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-md bg-primary/15 p-2">
          <Webhook className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Webhook Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Receive real-time events when billing activity happens.
          </p>
        </div>
      </div>

      {banner && (
        <div
          role="alert"
          className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
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

      <div className="space-y-2">
        <Label htmlFor="webhook-url" className="text-sm text-foreground">
          Endpoint URL
        </Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://api.yourapp.com/webhooks/substack"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="mt-5 space-y-3">
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

      <div className="mt-5 flex flex-wrap items-center gap-2">
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
          {testPending ? "Sending…" : "Send test webhook"}
        </Button>
      </div>

      {/* Delivery log */}
      <div className="mt-7">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Recent deliveries
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Radio className="mb-2 h-7 w-7 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          No deliveries yet
                        </p>
                        <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
                          Send a test webhook above to see delivery attempts
                          appear here.
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
                        <code className="font-mono text-xs text-foreground">
                          {d.event}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.statusCode >= 200 && d.statusCode < 300
                              ? "bg-[var(--success)]/15 text-[var(--success)]"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {d.statusCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {d.responseTimeMs}ms
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Card>
  )
}
