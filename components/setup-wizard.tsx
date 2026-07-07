"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { MERCHANT_CATEGORIES } from "@/lib/merchant-categories"
import { runSetupFromWizard } from "@/app/actions/setup"
import type { MerchantSetupResult } from "@/lib/merchant-setup"
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  CreditCard,
  Key,
  Webhook,
  XCircle,
} from "lucide-react"

const STEPS = [
  { id: 1, label: "Business", icon: Building2 },
  { id: 2, label: "Pricing", icon: CreditCard },
  { id: 3, label: "Retries", icon: AlertCircle },
  { id: 4, label: "Webhook", icon: Webhook },
]

const PRICING_PRESETS: Record<string, number[]> = {
  flat_monthly: [15000],
  tiered: [5000, 15000, 30000],
  usage_based: [3000, 10000, 25000],
}

export function SetupWizard({
  initialBusinessName,
  initialCategory,
}: {
  initialBusinessName: string
  initialCategory: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MerchantSetupResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [category, setCategory] = useState(initialCategory || "Fintech")
  const [pricingModel, setPricingModel] = useState<"flat_monthly" | "tiered" | "usage_based">(
    "tiered",
  )
  const [pricePointsText, setPricePointsText] = useState(
    PRICING_PRESETS.tiered.join(", "),
  )
  const [billingInterval, setBillingInterval] = useState<"monthly" | "weekly" | "annual">(
    "monthly",
  )
  const [retryPreference, setRetryPreference] = useState<
    "standard" | "aggressive" | "lenient"
  >("standard")
  const [webhookUrl, setWebhookUrl] = useState("")

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  function applyPricingModel(model: "flat_monthly" | "tiered" | "usage_based") {
    setPricingModel(model)
    setPricePointsText(PRICING_PRESETS[model].join(", "))
  }

  function parsePricePoints(): number[] | null {
    const points = pricePointsText
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    return points.length > 0 ? points : null
  }

  async function finishSetup() {
    const pricePoints = parsePricePoints()
    if (!pricePoints) {
      setError("Enter at least one price in NGN (comma-separated).")
      return
    }

    setError(null)
    setLoading(true)
    try {
      const setupResult = await runSetupFromWizard({
        businessName: businessName.trim(),
        category,
        pricingModel,
        pricePoints,
        currency: "NGN",
        billingInterval,
        retryPreference,
        webhookEndpointUrl: webhookUrl.trim() || undefined,
      })
      setResult(setupResult)
      setStep(5)
    } catch {
      setError("Setup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const progress = result ? 100 : (step / STEPS.length) * 100

  return (
    <div>
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon
            const done = s.id < step || !!result
            const current = s.id === step && !result
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm",
                    done || current
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  {done && !current ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={[
                    "hidden text-sm font-medium sm:inline",
                    current ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <Progress value={progress} className="h-2 bg-muted" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-card-foreground">Your business</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll use this to brand checkout pages and receipts.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business">Business name</Label>
              <Input
                id="business"
                placeholder="e.g. Paystack Labs"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MERCHANT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!businessName.trim()) {
                  setError("Please enter your business name.")
                  return
                }
                setError(null)
                setStep(2)
              }}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-card-foreground">Pricing intent</h2>
              <p className="text-sm text-muted-foreground">
                Subflow will create plans for you — no manual setup needed.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Pricing model</Label>
              <Select
                value={pricingModel}
                onValueChange={(v) =>
                  applyPricingModel(v as "flat_monthly" | "tiered" | "usage_based")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_monthly">Flat monthly</SelectItem>
                  <SelectItem value="tiered">Tiered (Starter / Growth / Pro)</SelectItem>
                  <SelectItem value="usage_based">Usage-based tiers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prices">Price points (₦, comma-separated)</Label>
              <Input
                id="prices"
                placeholder="5000, 15000, 30000"
                value={pricePointsText}
                onChange={(e) => setPricePointsText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing interval</Label>
              <Select
                value={billingInterval}
                onValueChange={(v) =>
                  setBillingInterval(v as "monthly" | "weekly" | "annual")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-card-foreground">Retry preference</h2>
              <p className="text-sm text-muted-foreground">
                How aggressively should Subflow retry failed charges?
              </p>
            </div>
            <div className="space-y-2">
              <Label>When a charge fails</Label>
              <Select
                value={retryPreference}
                onValueChange={(v) =>
                  setRetryPreference(v as "standard" | "aggressive" | "lenient")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — 3 attempts, every 3 days</SelectItem>
                  <SelectItem value="aggressive">
                    Aggressive — 5 attempts, every 1 day
                  </SelectItem>
                  <SelectItem value="lenient">Lenient — 2 attempts, every 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-card-foreground">
                Webhook URL (optional)
              </h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll send a real test ping to verify your endpoint. You can skip this and
                add it later in Settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook endpoint</Label>
              <Input
                id="webhook"
                type="url"
                placeholder="https://api.yoursite.com/webhooks/subflow"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)} disabled={loading}>
                Back
              </Button>
              <Button onClick={finishSetup} disabled={loading} className="flex-1">
                {loading ? "Setting up…" : "Finish setup"}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Need full control over every field? You can create plans manually from the Plans
              page after setup.
            </p>
          </div>
        )}

        {step === 5 && result && (
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--success)]" />
              <h2 className="text-lg font-semibold text-card-foreground">You&apos;re ready to charge</h2>
              <p className="text-sm text-muted-foreground">
                Plans, API keys, and monitoring are live. Copy the snippet below to start billing.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LayersIcon />
                Created plans
              </Label>
              <ul className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {result.plans.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span>
                      <strong>{p.name}</strong> — ID {p.id}
                    </span>
                    <code className="text-xs text-muted-foreground">
                      ₦{(p.amount / 100).toLocaleString("en-NG")}/{p.interval}
                    </code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API key
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs">
                  {result.apiKey}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyText("key", result.apiKey)}
                >
                  {copied === "key" ? (
                    <Check className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {result.webhookTest && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhook test
                </Label>
                <div
                  className={[
                    "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
                    result.webhookTest.delivered
                      ? "border-[var(--success)]/40 bg-[var(--success)]/10"
                      : "border-destructive/40 bg-destructive/10",
                  ].join(" ")}
                >
                  {result.webhookTest.delivered ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">
                      {result.webhookTest.delivered ? "Delivered" : "Failed"} — HTTP{" "}
                      {result.webhookTest.status_code} in {result.webhookTest.response_time_ms}ms
                    </p>
                    {result.webhookTest.error && (
                      <p className="mt-1 text-muted-foreground">{result.webhookTest.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Ready-to-use code
              </Label>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
                  {result.codeSnippet}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => copyText("snippet", result.codeSnippet)}
                >
                  {copied === "snippet" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                router.push("/dashboard")
                router.refresh()
              }}
            >
              Go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function LayersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  )
}
