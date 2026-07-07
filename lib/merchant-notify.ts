import "server-only"

import { db } from "@/lib/db"
import { merchant, user } from "@/lib/db/schema"
import {
  portalUrlForToken,
  sendCheckoutInviteEmail,
  sendDunningEmail,
  sendMerchantAlert,
  sendPaymentReceiptEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionPausedEmail,
} from "@/lib/email"
import { eq } from "drizzle-orm"

export type MerchantAlertContext = {
  businessName: string
  alertEmail: string | null
  slackWebhookUrl?: string
}

export type SubscriberEmailInfo = {
  email: string
  name: string
  planName: string
  portalToken?: string | null
}

export async function getMerchantAlertContext(userId: string): Promise<MerchantAlertContext> {
  const [m] = await db
    .select()
    .from(merchant)
    .where(eq(merchant.userId, userId))
    .limit(1)
  return {
    businessName: m?.businessName?.trim() || "your merchant",
    alertEmail: m?.alertEmail?.trim() || null,
    slackWebhookUrl: m?.slackWebhookUrl || undefined,
  }
}

export async function getMerchantUserEmail(userId: string) {
  const [row] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return row ?? null
}

export async function alertMerchant(userId: string, subject: string, body: string) {
  const ctx = await getMerchantAlertContext(userId)
  if (!ctx.alertEmail) return
  try {
    await sendMerchantAlert({
      to: ctx.alertEmail,
      subject,
      body,
      slackWebhookUrl: ctx.slackWebhookUrl,
    })
  } catch (e) {
    console.error("[merchant-notify] alert failed:", e)
  }
}

export async function notifyCheckoutInvite(opts: {
  userId: string
  customerName: string
  customerEmail: string
  planName: string
  amountKobo: number
  checkoutUrl: string
}) {
  const ctx = await getMerchantAlertContext(opts.userId)
  try {
    await sendCheckoutInviteEmail({
      to: opts.customerEmail,
      customerName: opts.customerName,
      planName: opts.planName,
      amountKobo: opts.amountKobo,
      checkoutUrl: opts.checkoutUrl,
      merchantName: ctx.businessName,
    })
  } catch (e) {
    console.error("[notify] checkout invite failed:", e)
  }
  await alertMerchant(
    opts.userId,
    `New subscriber started checkout — ${opts.customerName}`,
    `${opts.customerName} (${opts.customerEmail}) started checkout for ${opts.planName}. Awaiting first payment.`,
  )
}

export async function notifyPaymentReceipt(
  userId: string,
  sub: SubscriberEmailInfo,
  amountKobo: number,
  nombaRef: string,
) {
  const ctx = await getMerchantAlertContext(userId)
  const portalUrl = sub.portalToken ? portalUrlForToken(sub.portalToken) : undefined
  try {
    await sendPaymentReceiptEmail({
      to: sub.email,
      customerName: sub.name,
      planName: sub.planName,
      amountKobo,
      nombaRef,
      portalUrl,
      merchantName: ctx.businessName,
    })
  } catch (e) {
    console.error("[notify] payment receipt failed:", e)
  }
  await alertMerchant(
    userId,
    `Payment received — ${sub.name}`,
    `${sub.name} paid ${formatNgnFromKobo(amountKobo)} for ${sub.planName}. Ref: ${nombaRef}`,
  )
}

export async function notifyChargeFailed(
  userId: string,
  sub: SubscriberEmailInfo,
  amountKobo: number,
  opts: { retryDate: Date | null; finalAttempt: boolean; reason: string },
) {
  const portalUrl = sub.portalToken ? portalUrlForToken(sub.portalToken) : undefined
  try {
    await sendDunningEmail({
      to: sub.email,
      customerName: sub.name,
      planName: sub.planName,
      amountKobo,
      retryDate: opts.retryDate,
      portalUrl,
      finalAttempt: opts.finalAttempt,
    })
  } catch (e) {
    console.error("[notify] dunning email failed:", e)
  }
  await alertMerchant(
    userId,
    `Charge failed — ${sub.name}`,
    `${sub.name}: ${opts.reason}${opts.finalAttempt ? " — retries exhausted." : opts.retryDate ? ` Retry scheduled ${opts.retryDate.toDateString()}.` : ""}`,
  )
}

export async function notifySubscriptionCancelled(userId: string, sub: SubscriberEmailInfo) {
  const ctx = await getMerchantAlertContext(userId)
  try {
    await sendSubscriptionCancelledEmail({
      to: sub.email,
      customerName: sub.name,
      planName: sub.planName,
      merchantName: ctx.businessName,
    })
  } catch (e) {
    console.error("[notify] cancellation email failed:", e)
  }
  await alertMerchant(
    userId,
    `Subscription cancelled — ${sub.name}`,
    `${sub.name} cancelled ${sub.planName}.`,
  )
}

export async function notifySubscriptionPaused(userId: string, sub: SubscriberEmailInfo) {
  const ctx = await getMerchantAlertContext(userId)
  try {
    await sendSubscriptionPausedEmail({
      to: sub.email,
      customerName: sub.name,
      planName: sub.planName,
      merchantName: ctx.businessName,
    })
  } catch (e) {
    console.error("[notify] pause email failed:", e)
  }
  await alertMerchant(userId, `Subscription paused — ${sub.name}`, `${sub.name} was paused on ${sub.planName}.`)
}

export function formatNgnFromKobo(amountKobo: number): string {
  return (amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  })
}

