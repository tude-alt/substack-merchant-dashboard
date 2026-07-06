'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo, SubflowMark } from '@/components/logo'
import { ArrowRight, Zap, BarChart3, Lock } from 'lucide-react'

export function MarketingHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-border px-6 py-4 lg:px-12 lg:py-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo showWordmark={true} />
        </Link>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/60">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:px-12 lg:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-border">
            <SubflowMark className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-foreground/70">Recurring billing for Nigerian SaaS</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight text-balance">
            Billing infrastructure built for Nigeria
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-foreground/60 leading-relaxed text-pretty">
            Manage subscriptions, process recurring payments, and handle retries — all through a single API. Built with Nomba, optimized for Nigerian SaaS.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
              <Link href="/signup" className="flex items-center gap-2">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="https://developer.nomba.com" target="_blank">
                View docs
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Decorative logos */}
          <div className="absolute top-0 left-10 opacity-10">
            <SubflowMark className="w-32 h-32 text-primary" />
          </div>
          <div className="absolute bottom-20 right-10 opacity-10">
            <SubflowMark className="w-24 h-24 text-primary" />
          </div>

          <div className="text-center mb-16 space-y-4 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Everything you need</h2>
            <p className="text-lg text-foreground/60">Built specifically for Nigerian SaaS businesses</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-xl border border-border bg-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Instant Setup</h3>
              <p className="text-foreground/60">
                Create plans and start billing in minutes. No complex configuration needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-border bg-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Full Control</h3>
              <p className="text-foreground/60">
                Monitor MRR, track subscriptions, and manage retries from a clean dashboard.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-border bg-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Built on Nomba</h3>
              <p className="text-foreground/60">
                Leverage Nigeria&apos;s leading payment infrastructure with Subflow as your layer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative px-6 lg:px-12 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">How Subflow works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="text-5xl font-bold text-primary/20">01</div>
              <h3 className="text-xl font-semibold text-foreground">Create plans</h3>
              <p className="text-foreground/60">
                Define billing plans with pricing, intervals, and retry logic.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="text-5xl font-bold text-primary/20">02</div>
              <h3 className="text-xl font-semibold text-foreground">Add subscribers</h3>
              <p className="text-foreground/60">
                Onboard customers and assign them to plans via API or dashboard.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="text-5xl font-bold text-primary/20">03</div>
              <h3 className="text-xl font-semibold text-foreground">We handle the rest</h3>
              <p className="text-foreground/60">
                Automatic charges, retry logic, and webhook notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="relative px-6 lg:px-12 py-20 border-t border-border">
        {/* Decorative logos */}
        <div className="absolute top-10 right-5 opacity-10">
          <SubflowMark className="w-28 h-28 text-primary" />
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Simple pricing</h2>
          <p className="text-lg text-foreground/60">
            Pay only for what you use. No setup fees, no hidden charges.
          </p>
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-accent border border-border">
            <span className="text-2xl font-bold text-primary">2%</span>
            <span className="text-foreground/60">per transaction</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 lg:px-12 py-20 border-t border-border">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-foreground">Ready to get started?</h2>
          <p className="text-lg text-foreground/60">
            Join Nigerian SaaS founders who are already using Subflow to manage their billing.
          </p>
          <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
            <Link href="/signup" className="flex items-center gap-2">
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 lg:px-12 py-12 bg-accent/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">Pricing</a></li>
                <li><a href="https://developer.nomba.com" target="_blank" className="hover:text-foreground transition">Docs</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground transition">About</a></li>
                <li><a href="#" className="hover:text-foreground transition">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition">Contact</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground transition">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition">Terms</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Connect</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground transition">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Logo showWordmark={true} />
            </div>
            <p className="text-sm text-foreground/60">
              © 2026 Subflow. Built for Nigerian SaaS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
