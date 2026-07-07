import "server-only"

const DEFAULT_GMAIL_USER = "axiosbuild@gmail.com"

export function getDefaultFromAddress(): string {
  const gmailUser = process.env.GMAIL_USER?.trim() || DEFAULT_GMAIL_USER
  const name = process.env.EMAIL_FROM_NAME?.trim() || "Subflow"
  return `${name} <${gmailUser}>`
}

export function isGmailConfigured(): boolean {
  const user = process.env.GMAIL_USER?.trim() || DEFAULT_GMAIL_USER
  return Boolean(user && process.env.GMAIL_APP_PASSWORD?.trim())
}

export function emailLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="margin-bottom: 24px;">
      <strong style="font-size: 18px; color: #4f46e5;">Subflow</strong>
    </div>
    <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
    ${body}
    <p style="margin-top: 32px; font-size: 12px; color: #64748b;">
      Sent by Subflow · Recurring billing for Nigerian SaaS
    </p>
  </body>
</html>`
}

export function verificationCodeEmail(otp: string, purpose: string): string {
  return emailLayout(
    "Your verification code",
    `
    <p>Use this code to ${purpose}:</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.25em; font-family: monospace; color: #4f46e5;">${otp}</p>
    <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
  `,
  )
}

export function verificationLinkEmail(url: string): string {
  return emailLayout(
    "Verify your email",
    `
    <p>Click the button below to verify your email address:</p>
    <p><a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify email</a></p>
    <p style="color: #64748b; font-size: 14px;">Or copy this link: <br/><a href="${url}">${url}</a></p>
  `,
  )
}

export function passwordResetEmail(url: string): string {
  return emailLayout(
    "Reset your password",
    `
    <p>We received a request to reset your Subflow password.</p>
    <p><a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a></p>
    <p style="color: #64748b; font-size: 14px;">If you didn't request this, ignore this email.</p>
  `,
  )
}

export function welcomeEmail(name: string, onboardingUrl: string, examplesUrl: string): string {
  return emailLayout(
    "Welcome to Subflow",
    `
    <p>Hi ${name},</p>
    <p>Your Subflow merchant account is ready. Create a plan, share a checkout link, and start collecting recurring payments in NGN.</p>
    <p>
      <a href="${onboardingUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Complete setup</a>
    </p>
    <p style="color: #64748b; font-size: 14px;"><a href="${examplesUrl}">View integration examples</a></p>
  `,
  )
}

export function checkoutInviteEmail(opts: {
  customerName: string
  planName: string
  amountNgn: string
  checkoutUrl: string
  merchantName: string
}): string {
  return emailLayout(
    "Complete your subscription",
    `
    <p>Hi ${opts.customerName},</p>
    <p><strong>${opts.merchantName}</strong> invited you to subscribe to <strong>${opts.planName}</strong> (${opts.amountNgn}).</p>
    <p><a href="${opts.checkoutUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay &amp; subscribe</a></p>
    <p style="color: #64748b; font-size: 14px;">Or copy this link:<br/><a href="${opts.checkoutUrl}">${opts.checkoutUrl}</a></p>
  `,
  )
}

export function paymentReceiptEmail(opts: {
  customerName: string
  planName: string
  amountNgn: string
  nombaRef: string
  merchantName: string
  portalUrl?: string
}): string {
  const portalBlock = opts.portalUrl
    ? `<p><a href="${opts.portalUrl}">Manage your subscription</a></p>`
    : ""
  return emailLayout(
    "Payment receipt",
    `
    <p>Hi ${opts.customerName},</p>
    <p>Your payment of <strong>${opts.amountNgn}</strong> for <strong>${opts.planName}</strong> with ${opts.merchantName} was successful.</p>
    <p>Reference: <code>${opts.nombaRef}</code></p>
    ${portalBlock}
    <p>Thank you for subscribing.</p>
  `,
  )
}

export function dunningEmail(opts: {
  customerName: string
  planName: string
  amountNgn: string
  retryDate: string
  portalUrl?: string
  finalAttempt?: boolean
}): string {
  const portalBlock = opts.portalUrl
    ? `<p><a href="${opts.portalUrl}">Update your payment method</a></p>`
    : ""
  const retryLine = opts.finalAttempt
    ? "<p>We were unable to collect payment after multiple attempts. Your access may be suspended until payment is updated.</p>"
    : `<p>We'll try again on <strong>${opts.retryDate}</strong>.</p>`
  return emailLayout(
    "Payment failed — action needed",
    `
    <p>Hi ${opts.customerName},</p>
    <p>We couldn't process your recurring payment of <strong>${opts.amountNgn}</strong> for <strong>${opts.planName}</strong>.</p>
    ${retryLine}
    ${portalBlock}
  `,
  )
}

export function subscriptionCancelledEmail(opts: {
  customerName: string
  planName: string
  merchantName: string
}): string {
  return emailLayout(
    "Subscription cancelled",
    `
    <p>Hi ${opts.customerName},</p>
    <p>Your subscription to <strong>${opts.planName}</strong> with ${opts.merchantName} has been cancelled.</p>
    <p>You will not be charged again. If this was a mistake, contact your merchant.</p>
  `,
  )
}

export function subscriptionPausedEmail(opts: {
  customerName: string
  planName: string
  merchantName: string
}): string {
  return emailLayout(
    "Subscription paused",
    `
    <p>Hi ${opts.customerName},</p>
    <p>Your subscription to <strong>${opts.planName}</strong> with ${opts.merchantName} has been paused.</p>
    <p>Billing is on hold until your merchant reactivates your account.</p>
  `,
  )
}

export function onboardingCompleteEmail(opts: {
  merchantName: string
  dashboardUrl: string
  docsUrl: string
}): string {
  return emailLayout(
    "You're ready to charge",
    `
    <p>Hi ${opts.merchantName},</p>
    <p>Your Subflow setup is complete. Plans, API keys, and monitoring are configured.</p>
    <p>
      <a href="${opts.dashboardUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open dashboard</a>
    </p>
    <p style="color: #64748b; font-size: 14px;"><a href="${opts.docsUrl}">Integration guides</a></p>
  `,
  )
}

