"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn, signUp, authClient } from "@/lib/auth-client"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [info, setInfo] = useState<string | null>(null)

  const isSignUp = mode === "sign-up"

  async function verifyOtpAndContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: otpError } = await authClient.emailOtp.verifyEmail({ email, otp })
      if (otpError) {
        setError(otpError.message ?? "Invalid verification code.")
        setLoading(false)
        return
      }
      const { error: signInError } = await signIn.email({ email, password })
      if (signInError) {
        setError(signInError.message ?? "Could not sign in after verification.")
        setLoading(false)
        return
      }
      router.push("/onboarding")
      router.refresh()
    } catch {
      setError("Verification failed. Please try again.")
      setLoading(false)
    }
  }

  async function resendCode() {
    setError(null)
    setInfo(null)
    const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    })
    if (resendError) {
      setError(resendError.message ?? "Could not resend code.")
      return
    }
    setInfo("A new verification code was sent to your email.")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await signUp.email({ email, password, name })
        if (error) {
          setError(error.message ?? "Could not create your account.")
          setLoading(false)
          return
        }
        setInfo("We sent a 6-digit verification code to your email.")
        setOtpStep(true)
        setLoading(false)
        return
      } else {
        const { error, data } = await signIn.email({ email, password })
        if (error) {
          const needsVerify =
            error.message?.toLowerCase().includes("verify") ||
            error.message?.toLowerCase().includes("verification")
          if (needsVerify) {
            await authClient.emailOtp.sendVerificationOtp({
              email,
              type: "email-verification",
            })
            setInfo("Enter the verification code we sent to your email.")
            setOtpStep(true)
            setLoading(false)
            return
          }
          setError(error.message ?? "Invalid email or password.")
          setLoading(false)
          return
        }
        if (!data) {
          setError("Authentication failed. Please try again.")
          setLoading(false)
          return
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[auth] error:", err)
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {isSignUp
              ? "Set up recurring billing in minutes — we'll create your plans for you."
              : "Sign in to your merchant dashboard."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
          >
            {info}
          </div>
        )}

        {otpStep ? (
          <form onSubmit={verifyOtpAndContinue} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-11 bg-background text-center font-mono text-lg tracking-widest"
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
            </div>
            <Button type="submit" className="h-11 w-full text-base" disabled={loading || otp.length < 6}>
              {loading ? "Verifying…" : "Verify and continue"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={resendCode}>
              Resend code
            </Button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Obi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-background"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-background"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
            {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Subflow?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
