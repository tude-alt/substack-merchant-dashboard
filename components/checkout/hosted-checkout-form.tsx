"use client"

import { useState, useTransition } from "react"
import { submitHostedCheckout } from "@/app/actions/checkout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "per month",
  quarterly: "per quarter",
  annual: "per year",
}

type Props = {
  planId: number
  planName: string
  amountLabel: string
  interval: string
  businessName: string
  defaultName: string
  defaultEmail: string
  defaultPhone: string
}

export function HostedCheckoutForm({
  planId,
  planName,
  amountLabel,
  interval,
  businessName,
  defaultName,
  defaultEmail,
  defaultPhone,
}: Props) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [phone, setPhone] = useState(defaultPhone)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitHostedCheckout(planId, { name, email, phone })
      if (!result.ok) {
        setError(result.error)
        return
      }
      window.location.href = result.redirectUrl
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          {businessName || "Subflow"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {planName}
        </h1>
        <p className="mt-2 text-3xl font-semibold text-foreground">
          {amountLabel}
          <span className="text-base font-normal text-muted-foreground">
            {" "}
            {INTERVAL_LABEL[interval] ?? interval}
          </span>
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="checkout-name">Full name</Label>
          <Input
            id="checkout-name"
            name="name"
            autoComplete="name"
            placeholder="Ada Obi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-email">Email</Label>
          <Input
            id="checkout-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-phone">Phone (optional)</Label>
          <Input
            id="checkout-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Processing…" : "Subscribe"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Secured by Subflow · You&apos;ll complete payment on the next step
      </p>
    </form>
  )
}
