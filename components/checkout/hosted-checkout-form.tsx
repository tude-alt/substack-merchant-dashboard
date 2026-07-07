"use client"

import { useState, useTransition } from "react"
import { submitHostedCheckout } from "@/app/actions/checkout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Lock, Shield } from "lucide-react"

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "per month",
  weekly: "per week",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="bg-gradient-to-br from-primary to-indigo-500 px-6 py-5 text-white">
          <p className="text-sm font-medium text-indigo-100">
            {businessName || "Subflow merchant"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{planName}</h1>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">
            {amountLabel}
            <span className="text-base font-medium text-indigo-100">
              {" "}
              {INTERVAL_LABEL[interval] ?? interval}
            </span>
          </p>
        </div>
        <div className="px-6 py-4 text-sm text-muted-foreground">
          Recurring subscription · billed in NGN · cancel anytime from your merchant
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How checkout works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Enter your details below — this does not charge you yet.</li>
          <li>Continue to Nomba to pay securely with your card.</li>
          <li>After payment, your subscription becomes active.</li>
        </ol>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1 · Your details
        </p>
        <div className="space-y-2">
          <Label htmlFor="checkout-name">Full name</Label>
          <Input
            id="checkout-name"
            name="name"
            autoComplete="name"
            placeholder="Ada Obi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-background"
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
            className="h-11 bg-background"
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
            className="h-11 bg-background"
          />
        </div>
        <Button type="submit" className="h-12 w-full text-base" size="lg" disabled={isPending}>
          {isPending ? "Preparing secure payment…" : "Step 2 · Continue to payment"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You&apos;ll be redirected to Nomba to complete payment. You are not charged on this page.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          Encrypted
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          Powered by Nomba
        </span>
      </div>
    </form>
  )
}
