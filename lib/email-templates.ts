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
