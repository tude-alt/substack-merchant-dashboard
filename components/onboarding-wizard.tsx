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
import {
  PlanFormFields,
  emptyPlanForm,
  type PlanFormState,
} from "@/components/plan-form-fields"
import {
  saveBusinessInfo,
  completeOnboarding,
} from "@/app/actions/merchant"
import { createPlan } from "@/app/actions/plans"
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Layers,
} from "lucide-react"

const CATEGORIES = [
  "Fintech",
  "E-commerce",
  "Logistics",
  "HealthTech",
  "EdTech",
  "Developer Tools",
  "Media & Entertainment",
  "Other",
]

const STEPS = [
  { id: 1, label: "Business", icon: Building2 },
  { id: 2, label: "First plan", icon: Layers },
]

export function OnboardingWizard({
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

  // Step 1
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [category, setCategory] = useState(initialCategory || "Fintech")

  // Step 2
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm)

  async function handleStep1() {
    if (!businessName.trim()) {
      setError("Please enter your business name.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await saveBusinessInfo({ businessName: businessName.trim(), category })
      setStep(2)
    } catch {
      setError("Could not save your business info. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleFinish() {
    if (!planForm.name.trim() || !planForm.amount) {
      setError("Add a plan name and amount to finish.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await createPlan({
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        amount: Number(planForm.amount),
        currency: planForm.currency,
        interval: planForm.interval,
        trialDays: Number(planForm.trialDays) || 0,
        retryAttempts: Number(planForm.retryAttempts) || 0,
        retryIntervalDays: Number(planForm.retryIntervalDays) || 1,
      })
      await completeOnboarding()
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Could not finish setup. Please try again.")
      setLoading(false)
    }
  }

  const progress = (step / STEPS.length) * 100

  return (
    <div>
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon
            const done = s.id < step
            const current = s.id === step
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
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
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
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
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
              <h2 className="text-lg font-semibold text-card-foreground">
                Tell us about your business
              </h2>
              <p className="text-sm text-muted-foreground">
                This appears on your invoices and receipts.
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
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStep1} disabled={loading} className="w-full">
              {loading ? "Saving…" : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-card-foreground">
                Create your first plan
              </h2>
              <p className="text-sm text-muted-foreground">
                You can add more plans later from the Plans page.
              </p>
            </div>
            <PlanFormFields value={planForm} onChange={setPlanForm} />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button onClick={handleFinish} disabled={loading} className="flex-1">
                {loading ? "Finishing…" : "Finish setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
