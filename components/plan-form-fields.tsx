"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PlanFormState = {
  name: string
  description: string
  amount: string
  currency: string
  interval: string
  trialDays: string
  retryAttempts: string
  retryIntervalDays: string
}

export const emptyPlanForm: PlanFormState = {
  name: "",
  description: "",
  amount: "",
  currency: "NGN",
  interval: "monthly",
  trialDays: "0",
  retryAttempts: "3",
  retryIntervalDays: "3",
}

export function PlanFormFields({
  value,
  onChange,
}: {
  value: PlanFormState
  onChange: (next: PlanFormState) => void
}) {
  function set<K extends keyof PlanFormState>(key: K, v: string) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan-name">Plan name</Label>
        <Input
          id="plan-name"
          placeholder="Growth"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-desc">Description</Label>
        <Textarea
          id="plan-desc"
          placeholder="For scaling SaaS businesses across Nigeria."
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan-amount">Amount (₦)</Label>
          <Input
            id="plan-amount"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="25000"
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-currency">Currency</Label>
          <Select value={value.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger id="plan-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">NGN (₦)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-interval">Billing interval</Label>
        <Select value={value.interval} onValueChange={(v) => set("interval", v)}>
          <SelectTrigger id="plan-interval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan-trial">Trial (days)</Label>
          <Input
            id="plan-trial"
            type="number"
            min="0"
            value={value.trialDays}
            onChange={(e) => set("trialDays", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-retries">Retry attempts</Label>
          <Input
            id="plan-retries"
            type="number"
            min="0"
            value={value.retryAttempts}
            onChange={(e) => set("retryAttempts", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-retry-int">Retry every (days)</Label>
          <Input
            id="plan-retry-int"
            type="number"
            min="1"
            value={value.retryIntervalDays}
            onChange={(e) => set("retryIntervalDays", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
