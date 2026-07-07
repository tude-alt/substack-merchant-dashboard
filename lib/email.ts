import "server-only"

import nodemailer from "nodemailer"
import { getAppUrl } from "@/lib/billing"
import {
  getDefaultFromAddress,
  isGmailConfigured,
  passwordResetEmail,
  verificationCodeEmail,
  verificationLinkEmail,
} from "@/lib/email-templates"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

const DEFAULT_GMAIL_USER = "axiosbuild@gmail.com"

function getGmailUser(): string {
  return process.env.GMAIL_USER?.trim() || DEFAULT_GMAIL_USER
}

async function sendViaGmail(input: SendEmailInput): Promise<{ sent: boolean; provider: string }> {
  const user = getGmailUser()
  const pass = process.env.GMAIL_APP_PASSWORD?.trim()
  if (!pass) return { sent: false, provider: "gmail" }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })

  await transporter.sendMail({
    from: getDefaultFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return { sent: true, provider: "gmail" }
}

async function sendViaResend(input: SendEmailInput): Promise<{ sent: boolean; provider: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim() || getDefaultFromAddress()
  if (!apiKey) return { sent: false, provider: "resend" }

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

/**
 * Send email via Gmail (preferred), Resend, or console log in development.
 * Default sender: Subflow &lt;axiosbuild@gmail.com&gt; when using Gmail.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; provider: string }> {
  if (isGmailConfigured()) {
    try {
      return await sendViaGmail(input)
    } catch (e) {
      console.error("[email] Gmail send failed:", e)
    }
  }

  const resend = await sendViaResend(input)
  if (resend.sent) return resend

  console.log(
    `[email] (dev) From: ${getDefaultFromAddress()}\nTo: ${input.to}\nSubject: ${input.subject}\n${input.text ?? input.html}`,
  )
  return { sent: true, provider: "log" }
}

export async function sendVerificationCodeEmail(opts: {
  to: string
  otp: string
  type: "sign-in" | "email-verification" | "forget-password" | "change-email"
}) {
  const purpose =
    opts.type === "forget-password"
      ? "reset your password"
      : opts.type === "sign-in"
        ? "sign in"
        : "verify your email"

  return sendEmail({
    to: opts.to,
    subject: `Your Subflow verification code: ${opts.otp}`,
    html: verificationCodeEmail(opts.otp, purpose),
    text: `Your Subflow verification code is ${opts.otp}. It expires in 5 minutes.`,
  })
}

export async function sendVerificationLinkEmail(opts: { to: string; url: string }) {
  return sendEmail({
    to: opts.to,
    subject: "Verify your Subflow email",
    html: verificationLinkEmail(opts.url),
    text: `Verify your email: ${opts.url}`,
  })
}

export async function sendPasswordResetEmail(opts: { to: string; url: string }) {
  return sendEmail({
    to: opts.to,
    subject: "Reset your Subflow password",
    html: passwordResetEmail(opts.url),
    text: `Reset your password: ${opts.url}`,
  })
}

export async function sendWelcomeEmail(opts: { to: string; name: string }) {
  const appUrl = getAppUrl()
  return sendEmail({
    to: opts.to,
    subject: "Welcome to Subflow",
    html: `
      <p>Hi ${opts.name},</p>
      <p>Your Subflow merchant account is ready. Create a plan, share a checkout link, and start collecting recurring payments in NGN.</p>
      <p><a href="${appUrl}/onboarding">Complete setup</a> · <a href="${appUrl}/dashboard/docs/examples">View examples</a></p>
    `,
    text: `Welcome to Subflow. Complete setup at ${appUrl}/onboarding`,
  })
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
