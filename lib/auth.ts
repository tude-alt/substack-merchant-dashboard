import { betterAuth } from "better-auth"
import { emailOTP } from "better-auth/plugins"
import { pool } from "@/lib/db"
import {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendVerificationLinkEmail,
  sendWelcomeEmail,
} from "@/lib/email"
import { isGmailConfigured } from "@/lib/email-templates"

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL)

export const auth = betterAuth({
  database: pool,
  baseURL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: !isGmailConfigured(),
    requireEmailVerification: isGmailConfigured(),
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({ to: user.email, url })
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationLinkEmail({ to: user.email, url })
    },
    sendOnSignUp: isGmailConfigured(),
    sendOnSignIn: false,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOnSignUp: isGmailConfigured(),
      async sendVerificationOTP({ email, otp, type }) {
        void sendVerificationCodeEmail({ to: email, otp, type })
      },
    }),
  ],
  trustedOrigins: [
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://subflow-merchant-dashboard.vercel.app",
    "https://substack-merchant-dashboard.vercel.app",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "development" ? ("none" as const) : ("lax" as const),
      secure: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (isGmailConfigured()) {
            void sendWelcomeEmail({ to: user.email, name: user.name || "there" })
          }
        },
      },
    },
  },
})

// Re-export for server actions that need generic send
export { sendEmail }
