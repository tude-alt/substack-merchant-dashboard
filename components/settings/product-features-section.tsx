"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveAlertSettings, saveBranding } from "@/app/actions/merchant"
import { createCoupon } from "@/app/actions/coupons"
import { exportTransactionsCsv } from "@/app/actions/export"
import { Download, Palette, Bell, Tag } from "lucide-react"

export function ProductFeaturesSection({
  logoUrl,
  brandColor,
  alertEmail,
  slackWebhookUrl,
}: {
  logoUrl: string
  brandColor: string
  alertEmail: string
  slackWebhookUrl: string
}) {
  const router = useRouter()
  const [logo, setLogo] = useState(logoUrl)
  const [color, setColor] = useState(brandColor || "#4f46e5")
  const [email, setEmail] = useState(alertEmail)
  const [slack, setSlack] = useState(slackWebhookUrl)
  const [couponCode, setCouponCode] = useState("")
  const [couponPercent, setCouponPercent] = useState("10")
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function saveBrand() {
    startTransition(async () => {
      await saveBranding({ logoUrl: logo, brandColor: color })
      setMessage("Branding saved.")
      router.refresh()
    })
  }

  function saveAlerts() {
    startTransition(async () => {
      await saveAlertSettings({ alertEmail: email, slackWebhookUrl: slack })
      setMessage("Alert settings saved.")
      router.refresh()
    })
  }

  function addCoupon() {
    startTransition(async () => {
      const res = await createCoupon({
        code: couponCode,
        percentOff: Number(couponPercent) || 0,
        amountOff: 0,
      })
      setMessage(res.ok ? `Coupon ${couponCode.toUpperCase()} created.` : res.error ?? "Failed.")
      if (res.ok) setCouponCode("")
      router.refresh()
    })
  }

  function downloadCsv() {
    startTransition(async () => {
      const csv = await exportTransactionsCsv()
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `subflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Branded checkout</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input id="logo-url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-color">Brand color</Label>
            <Input id="brand-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" onClick={saveBrand} disabled={pending}>
          Save branding
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Payment alerts</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="alert-email">Alert email</Label>
            <Input id="alert-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slack-url">Slack webhook (optional)</Label>
            <Input id="slack-url" value={slack} onChange={(e) => setSlack(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" onClick={saveAlerts} disabled={pending}>
          Save alerts
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Coupons</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="coupon-code">Code</Label>
            <Input id="coupon-code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="uppercase" />
          </div>
          <div className="w-full space-y-2 sm:w-28">
            <Label htmlFor="coupon-pct">% off</Label>
            <Input id="coupon-pct" type="number" value={couponPercent} onChange={(e) => setCouponPercent(e.target.value)} />
          </div>
          <Button onClick={addCoupon} disabled={pending}>
            Create coupon
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Revenue export</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Download all transactions as CSV for accounting or reporting.
        </p>
        <Button variant="outline" onClick={downloadCsv} disabled={pending} className="gap-2">
          <Download className="h-4 w-4" />
          Export transactions CSV
        </Button>
      </Card>
    </div>
  )
}
