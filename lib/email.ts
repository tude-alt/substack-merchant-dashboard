import "server-only"

import { getAppUrl } from "@/lib/billing"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

/** Send email via Resend when configured; otherwise log for development. */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; provider: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim() || "Subflow <billing@subflow.africa>"

  if (!apiKey) {
    console.log(`[email] (dev) To: ${input.to}\nSubject: ${input.subject}\n${input.text ?? input.html}`)
    return { sent: true, provider: "log" }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error("[email] Resend error:", res.status, body)
    return { sent: false, provider: "resend" }
  }

  return { sent: true, provider: "resend" }
}

export async function sendPaymentReceiptEmail(opts: {
  to: string
  customerName: string
  planName: string
  amountKobo: number
  nombaRef: string
  portalUrl?: string
  merchantName: string
}) {
  const amount = (opts.amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  })

  const portalBlock = opts.portalUrl
    ? `<p><a href="${opts.portalUrl}">Manage your subscription</a></p>`
    : ""

  return sendEmail({
    to: opts.to,
    subject: `Payment receipt — ${opts.planName}`,
    html: `
      <p>Hi ${opts.customerName},</p>
      <p>Your payment of <strong>${amount}</strong> for <strong>${opts.planName}</strong> with ${opts.merchantName} was successful.</p>
      <p>Reference: <code>${opts.nombaRef}</code></p>
      ${portalBlock}
      <p>Thank you for subscribing.</p>
    `,
    text: `Payment of ${amount} for ${opts.planName} succeeded. Ref: ${opts.nombaRef}.`,
  })
}

export async function sendDunningEmail(opts: {
  to: string
  customerName: string
  planName: string
  amountKobo: number
  retryDate: Date
  portalUrl?: string
}) {
  const amount = (opts.amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  })

  return sendEmail({
    to: opts.to,
    subject: `Action needed — payment failed for ${opts.planName}`,
    html: `
      <p>Hi ${opts.customerName},</p>
      <p>We couldn't process your recurring payment of <strong>${amount}</strong> for <strong>${opts.planName}</strong>.</p>
      <p>We'll try again on <strong>${opts.retryDate.toDateString()}</strong>.</p>
      ${opts.portalUrl ? `<p><a href="${opts.portalUrl}">Update your payment method</a></p>` : ""}
    `,
    text: `Payment of ${amount} for ${opts.planName} failed. Retry scheduled for ${opts.retryDate.toDateString()}.`,
  })
}

export async function sendMerchantAlert(opts: {
  to: string
  subject: string
  body: string
  slackWebhookUrl?: string
}) {
  await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: `<p>${opts.body}</p>`,
    text: opts.body,
  })

  if (opts.slackWebhookUrl?.trim()) {
    try {
      await fetch(opts.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${opts.subject}\n${opts.body}` }),
      })
    } catch (e) {
      console.error("[alerts] Slack webhook failed:", e)
    }
  }
}

export function portalUrlForToken(token: string): string {
  return `${getAppUrl()}/portal/${token}`
}
