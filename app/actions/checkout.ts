"use server"

import {
  buildSubscriberCreateResponse,
  createSubscriberForMerchant,
  NombaApiError,
  NombaConfigError,
  PlanNotFoundError,
} from "@/lib/api/create-subscriber"
import {
  getHostedCheckoutPlan,
  getMerchantForPlan,
  hostedCheckoutConfirmationUrl,
} from "@/lib/checkout"

export type CheckoutSubmitResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string }

export async function submitHostedCheckout(
  planId: number,
  fields: { name: string; email: string; phone: string; coupon?: string },
): Promise<CheckoutSubmitResult> {
  const name = fields.name.trim()
  const email = fields.email.trim().toLowerCase()
  const phone = fields.phone.trim()

  if (!name || !email) {
    return { ok: false, error: "Name and email are required." }
  }

  const ctx = await getMerchantForPlan(planId)
  if (!ctx) {
    return { ok: false, error: "This checkout link is invalid or the plan no longer exists." }
  }

  const planDetails = await getHostedCheckoutPlan(planId)
  const successRedirect =
    planDetails?.successRedirectUrl?.trim() || hostedCheckoutConfirmationUrl(planId)

  try {
    const result = await createSubscriberForMerchant({
      userId: ctx.planUserId,
      mode: "live",
      channel: "checkout",
      name,
      email,
      phone,
      planId,
      callbackUrl: successRedirect,
      couponCode: fields.coupon,
    })

    const { data } = buildSubscriberCreateResponse(
      result.subscriber,
      result.kind === "created" ? "created" : "existing",
    )

    if (data.checkout_url) {
      return { ok: true, redirectUrl: data.checkout_url }
    }

    return { ok: true, redirectUrl: successRedirect }
  } catch (e) {
    if (e instanceof PlanNotFoundError) {
      return { ok: false, error: "This plan could not be found." }
    }
    if (e instanceof NombaConfigError) {
      return {
        ok: false,
        error: "Payments are not configured for this merchant yet. Please try again later.",
      }
    }
    if (e instanceof NombaApiError) {
      return { ok: false, error: "Payment setup failed. Please try again." }
    }
    console.error("[checkout] submitHostedCheckout failed:", e)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
