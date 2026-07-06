"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { regenerateApiKey } from "@/app/actions/merchant"
import { Eye, EyeOff, Copy, Check, RefreshCw, KeyRound } from "lucide-react"

type KeyRowProps = {
  id: string
  label: string
  badge: string
  badgeClass: string
  value: string
  which: "live" | "test"
}

function KeyRow({ id, label, badge, badgeClass, value, which }: KeyRowProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [current, setCurrent] = useState(value)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const masked = `${current.slice(0, 8)}${"•".repeat(20)}`

  function copy() {
    navigator.clipboard.writeText(current)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function regenerate() {
    startTransition(async () => {
      const key = await regenerateApiKey(which)
      setCurrent(key)
      setConfirming(false)
      setRevealed(true)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-sm text-foreground">
          {label}
        </Label>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          id={id}
          className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground"
        >
          {revealed ? current : masked}
        </code>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide key" : "Show key"}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={copy}
            aria-label="Copy key"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--success)]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {confirming ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <span className="text-foreground">
            Regenerate this key? The old key stops working immediately.
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={regenerate}
              disabled={isPending}
            >
              {isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setConfirming(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate {label.toLowerCase()}
        </Button>
      )}
    </div>
  )
}

export function ApiKeysSection({
  liveApiKey,
  testApiKey,
  embedded = false,
}: {
  liveApiKey: string
  testApiKey: string
  embedded?: boolean
}) {
  const content = (
    <>
      {!embedded && (
        <div className="mb-5 flex items-center gap-2">
          <div className="rounded-md bg-primary/15 p-2">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Use these to authenticate requests to the Subflow API.
            </p>
          </div>
        </div>
      )}
      {embedded && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-foreground">API keys</h3>
          <p className="text-sm text-muted-foreground">
            Set <code className="font-mono text-xs">SUBFLOW_API_KEY</code> to your test or live key.
          </p>
        </div>
      )}
      <div className="space-y-6">
        <KeyRow
          id="live-key"
          label="Live key"
          badge="LIVE"
          badgeClass="bg-[var(--success)]/15 text-[var(--success)]"
          value={liveApiKey}
          which="live"
        />
        <KeyRow
          id="test-key"
          label="Test key"
          badge="TEST"
          badgeClass="bg-muted text-muted-foreground"
          value={testApiKey}
          which="test"
        />
      </div>
    </>
  )

  if (embedded) return content

  return <Card className="p-5">{content}</Card>
}
