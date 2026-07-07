"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"

type InitialState = {
  title: string
  message: string
  tone: "success" | "pending" | "neutral"
  orderRef?: string
}

export function CheckoutSuccessClient({ initial }: { initial: InitialState }) {
  const [title, setTitle] = useState(initial.title)
  const [message, setMessage] = useState(initial.message)
  const [tone, setTone] = useState(initial.tone)
  const [retrying, setRetrying] = useState(false)
  const orderRef = initial.orderRef

  useEffect(() => {
    if (!orderRef || tone === "success") return

    let attempts = 0
    const maxAttempts = 8

    const timer = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(timer)
        return
      }
      attempts += 1
      setRetrying(true)
      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderReference: orderRef }),
        })
        const data = await res.json()
        const status = data.result?.status
        if (status === "activated" || status === "already_active") {
          setTitle("Payment successful — you're subscribed!")
          setMessage(
            "Your card payment was confirmed and your subscription is now active. Your merchant's dashboard has been updated.",
          )
          setTone("success")
          clearInterval(timer)
        }
      } catch {
        // keep retrying
      } finally {
        setRetrying(false)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [orderRef, tone])

  const Icon =
    tone === "success" ? CheckCircle2 : tone === "pending" ? Clock : AlertCircle
  const iconWrap =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-600"
      : tone === "pending"
        ? "bg-amber-500/15 text-amber-600"
        : "bg-muted text-muted-foreground"

  return (
    <>
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{message}</p>
      {retrying && tone === "pending" && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking payment with Nomba…
        </p>
      )}
      {orderRef && tone === "pending" && (
        <p className="mt-4 text-xs text-muted-foreground">
          Reference: <code className="font-mono">{orderRef}</code>
        </p>
      )}
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">Done</Link>
      </Button>
    </>
  )
}
