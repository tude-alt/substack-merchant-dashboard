'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { DashboardMockup } from '@/components/dashboard-mockup'
import {
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Link2,
  Shield,
  Zap,
} from 'lucide-react'

const INTEGRATION_TIERS = [
  {
    icon: Link2,
    title: 'Hosted checkout link',
    effort: 'Zero code',
    description: 'Share a link or embed a button. Customers subscribe without you writing a backend.',
    example: 'yoursite.com → subflow.africa/checkout/43',
  },
  {
    icon: Code2,
    title: 'SDK',
    effort: '5 lines',
    description: 'Full programmatic control with TypeScript types. Auto-provision plans on first call.',
    example: 'subflow.subscribe({ planId, email, name })',
  },
  {
    icon: Zap,
    title: 'REST API',
    effort: 'Direct',
    description: 'Plans, subscribers, and webhooks for teams that want full control.',
    example: 'POST /api/v1/subscribers',
  },
]

const TRUST = ['Nomba payments', 'NGN native', 'Webhook signed', 'API keys', 'Hosted checkout']

export function MarketingHome() {
  return (
    <div className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/60 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex lg:gap-8">
            <a href="#product" className="transition hover:text-foreground">Product</a>
            <a href="#integrate" className="transition hover:text-foreground">Integrate</a>
            <Link href="/examples" className="transition hover:text-foreground">Examples</Link>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="sm:h-10 sm:px-4">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-hero opacity-60" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center justify-center gap-2.5 text-sm font-medium text-muted-foreground">
              <Logo showWordmark={false} className="gap-0" />
              <span>Recurring billing for Nigerian SaaS</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Go from signup to{' '}
              <span className="text-gradient">first charge</span> in one session
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Plans, hosted checkout, subscriptions, retries, and webhooks — powered by Nomba.
              Share a link, paste a script tag, or call the API. Your customers pay in NGN.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Button size="lg" asChild className="h-11 w-full px-6 text-base shadow-elevated sm:h-12 sm:w-auto sm:px-8">
                <Link href="/signup" className="gap-2">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 w-full bg-card px-6 text-base sm:h-12 sm:w-auto sm:px-8">
                <Link href="/login">Sign in to dashboard</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {TRUST.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 lg:mt-20" id="product">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Integration tiers */}
      <section id="integrate" className="border-y border-border bg-card/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Three ways to integrate. Pick your speed.
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty">
              Most merchants start with a checkout link. Developers graduate to the SDK when they need more control.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {INTEGRATION_TIERS.map((tier) => {
              const Icon = tier.icon
              return (
                <div
                  key={tier.title}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/30 hover:shadow-elevated"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {tier.effort}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{tier.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tier.description}</p>
                  <code className="mt-4 block rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                    {tier.example}
                  </code>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything a billing stack should handle
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty">
              Subflow is not just a dashboard — it is the subscription layer between your product and Nomba.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Auto-setup wizard creates plans, API keys, and monitoring',
                'Per-plan MRR, churn, and failed charge alerts',
                'Signed webhooks with delivery logs',
                'Retry logic you configure once, not per subscriber',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: 'Revenue analytics', sub: 'MRR & trends' },
              { icon: Shield, label: 'Secure webhooks', sub: 'HMAC-SHA256' },
              { icon: Zap, label: 'Smart retries', sub: 'Configurable' },
              { icon: Link2, label: 'Checkout links', sub: 'Per plan' },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.label}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.sub}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Case study */}
      <section className="border-t border-border bg-card/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Built for real Nigerian SaaS teams</h2>
          <blockquote className="mt-8 rounded-2xl border border-border bg-card p-8 text-left shadow-card">
            <p className="text-lg leading-relaxed text-foreground text-pretty">
              &ldquo;We went from manual bank transfers to automated recurring billing in an afternoon.
              Shared a checkout link, customers paid in NGN, and our dashboard updated automatically.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-muted-foreground">
              — Health & wellness SaaS merchant, Lagos
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-card/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-4 text-muted-foreground">No setup fees. No monthly platform charge during early access.</p>
          <div className="mt-10 inline-flex flex-col items-center rounded-2xl border border-primary/20 bg-card px-10 py-8 shadow-elevated">
            <p className="text-5xl font-extrabold text-gradient">2%</p>
            <p className="mt-2 text-muted-foreground">per successful transaction</p>
            <p className="mt-4 text-sm text-muted-foreground">+ Nomba payment processing fees</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-500 px-5 py-10 text-center text-white shadow-elevated sm:rounded-3xl sm:px-16 sm:py-14">
          <h2 className="text-2xl font-bold sm:text-4xl">Ready to bill customers in NGN?</h2>
          <p className="mx-auto mt-4 max-w-lg text-indigo-100 text-pretty">
            Create your account, run the setup wizard, and share your first checkout link today.
          </p>
          <Button size="lg" asChild className="mt-8 h-12 bg-white px-8 text-base text-primary hover:bg-white/90">
            <Link href="/signup">Create free account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <Logo />
          <p className="text-sm text-muted-foreground">© 2026 Subflow · Team Axios · Nomba Hackathon</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/status" className="hover:text-foreground">Status</Link>
            <Link href="/examples" className="hover:text-foreground">Examples</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
