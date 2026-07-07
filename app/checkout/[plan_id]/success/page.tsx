import { Logo } from "@/components/logo"
import { confirmInitialPaymentByOrderReference } from "@/lib/confirm-payment"
import { CheckoutSuccessClient } from "@/components/checkout/checkout-success-client"

type PageProps = {
  searchParams: Promise<{ ref?: string; orderReference?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams
  const orderRef = query.ref?.trim() || query.orderReference?.trim()

  let title = "Confirming your payment"
  let message =
    "Step 2 complete — we're verifying your card payment with Nomba. This usually takes a few seconds."
  let tone: "success" | "pending" | "neutral" = "pending"

  if (orderRef) {
    const result = await confirmInitialPaymentByOrderReference(orderRef)
    switch (result.status) {
      case "activated":
        title = "Payment successful — you're subscribed!"
        message =
          "Your card payment was confirmed and your subscription is now active. Your merchant's dashboard has been updated."
        tone = "success"
        break
      case "already_active":
        title = "You're subscribed!"
        message = "Your subscription is already active. You can close this page."
        tone = "success"
        break
      case "not_paid":
        title = "Payment pending"
        message =
          result.reason ||
          "We haven't received confirmation from Nomba yet. This page will keep checking automatically."
        tone = "pending"
        break
      case "not_found":
        title = "Subscription not found"
        message =
          "We couldn't match this payment to a subscription. Contact your merchant if you were charged."
        tone = "neutral"
        break
    }
  } else {
    title = "Thanks!"
    message =
      "If you completed payment, your merchant will confirm your subscription shortly. Check your email for updates."
    tone = "neutral"
  }

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <Logo />
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elevated">
          <CheckoutSuccessClient
            initial={{ title, message, tone, orderRef: orderRef || undefined }}
          />
        </div>
      </div>
    </div>
  )
}
