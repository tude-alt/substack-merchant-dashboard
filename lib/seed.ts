import "server-only"

import { db } from "@/lib/db"
import { plan, subscriber, transaction, activity } from "@/lib/db/schema"

// Realistic Nigerian SaaS dummy data. Amounts are stored in kobo.
const N = (naira: number) => naira * 100

type SeedPlan = {
  name: string
  description: string
  amount: number
  interval: string
  trialDays: number
  retryAttempts: number
  retryIntervalDays: number
}

const SEED_PLANS: SeedPlan[] = [
  {
    name: "Starter",
    description: "For small teams getting started with billing.",
    amount: N(7500),
    interval: "monthly",
    trialDays: 14,
    retryAttempts: 3,
    retryIntervalDays: 3,
  },
  {
    name: "Growth",
    description: "For scaling SaaS businesses across Nigeria.",
    amount: N(25000),
    interval: "monthly",
    trialDays: 7,
    retryAttempts: 4,
    retryIntervalDays: 2,
  },
  {
    name: "Scale (Quarterly)",
    description: "Quarterly billing for established merchants.",
    amount: N(180000),
    interval: "quarterly",
    trialDays: 0,
    retryAttempts: 3,
    retryIntervalDays: 4,
  },
  {
    name: "Enterprise (Annual)",
    description: "Annual contracts with priority support.",
    amount: N(960000),
    interval: "annual",
    trialDays: 0,
    retryAttempts: 5,
    retryIntervalDays: 5,
  },
]

type SeedSub = {
  name: string
  email: string
  phone: string
  planIndex: number
  status: "active" | "suspended" | "cancelled"
  lastChargeResult: "successful" | "failed" | "pending"
}

const SEED_SUBS: SeedSub[] = [
  { name: "Bumpa", email: "billing@getbumpa.com", phone: "0803 412 8890", planIndex: 1, status: "active", lastChargeResult: "successful" },
  { name: "Accounteer", email: "finance@accounteer.io", phone: "0816 220 1145", planIndex: 0, status: "active", lastChargeResult: "successful" },
  { name: "Sabi", email: "ops@sabi.am", phone: "0802 991 7732", planIndex: 3, status: "active", lastChargeResult: "successful" },
  { name: "Duplo", email: "accounts@tryduplo.com", phone: "0809 556 3201", planIndex: 2, status: "active", lastChargeResult: "successful" },
  { name: "Mono", email: "billing@mono.co", phone: "0701 884 9920", planIndex: 1, status: "suspended", lastChargeResult: "failed" },
  { name: "Paystack Labs", email: "team@paystacklabs.ng", phone: "0805 102 6677", planIndex: 1, status: "active", lastChargeResult: "successful" },
  { name: "Cowrywise", email: "ar@cowrywise.com", phone: "0813 770 4419", planIndex: 0, status: "active", lastChargeResult: "successful" },
  { name: "Kuda Tech", email: "billing@kuda.ng", phone: "0808 339 2210", planIndex: 3, status: "active", lastChargeResult: "successful" },
  { name: "Reliance HMO", email: "finance@reliancehmo.com", phone: "0814 667 8801", planIndex: 1, status: "suspended", lastChargeResult: "failed" },
  { name: "Termii", email: "accounts@termii.com", phone: "0802 445 9912", planIndex: 0, status: "active", lastChargeResult: "successful" },
  { name: "Eden Life", email: "billing@edenlife.ng", phone: "0807 220 1190", planIndex: 1, status: "active", lastChargeResult: "pending" },
  { name: "Vendease", email: "ops@vendease.com", phone: "0815 998 3340", planIndex: 2, status: "active", lastChargeResult: "successful" },
  { name: "Brass", email: "finance@trybrass.com", phone: "0803 110 5567", planIndex: 1, status: "cancelled", lastChargeResult: "failed" },
  { name: "Anchor", email: "billing@getanchor.co", phone: "0809 774 2218", planIndex: 0, status: "active", lastChargeResult: "successful" },
  { name: "Pivo", email: "team@pivo.africa", phone: "0816 553 7790", planIndex: 1, status: "active", lastChargeResult: "successful" },
]

const FAILURE_REASONS = [
  "Insufficient funds",
  "Card declined by issuer",
  "Expired card",
  "Transaction limit exceeded",
  "Do not honour",
]

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function ref(): string {
  return "NMB-" + Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function seedMerchantData(userId: string) {
  // Insert plans, capture their generated ids.
  const insertedPlans = await db
    .insert(plan)
    .values(SEED_PLANS.map((p) => ({ ...p, userId, currency: "NGN" })))
    .returning({ id: plan.id, name: plan.name, amount: plan.amount, interval: plan.interval })

  // Map seed plan index -> inserted plan row.
  const subsToInsert = SEED_SUBS.map((s, i) => {
    const p = insertedPlans[s.planIndex]
    // Normalise MRR to a monthly figure for quarterly/annual plans.
    let mrr = p.amount
    if (p.interval === "quarterly") mrr = Math.round(p.amount / 3)
    if (p.interval === "annual") mrr = Math.round(p.amount / 12)
    if (s.status === "cancelled") mrr = 0
    return {
      userId,
      name: s.name,
      email: s.email,
      phone: s.phone,
      planId: p.id,
      planName: p.name,
      status: s.status,
      billingDate: daysFromNow((i % 28) + 1),
      lastChargeResult: s.lastChargeResult,
      mrr,
      createdAt: daysAgo(120 - i * 5),
    }
  })

  const insertedSubs = await db
    .insert(subscriber)
    .values(subsToInsert)
    .returning({
      id: subscriber.id,
      name: subscriber.name,
      planName: subscriber.planName,
      planId: subscriber.planId,
    })

  // Build a transaction history: a few months of charges per subscriber.
  const txns: (typeof transaction.$inferInsert)[] = []
  insertedSubs.forEach((sub, idx) => {
    const seed = SEED_SUBS[idx]
    const p = insertedPlans.find((pp) => pp.id === sub.planId)!
    // 3-5 historical charges
    const count = 3 + (idx % 3)
    for (let c = 0; c < count; c++) {
      const isLast = c === count - 1
      const failed = isLast && seed.lastChargeResult === "failed"
      const pending = isLast && seed.lastChargeResult === "pending"
      const status = failed ? "failed" : pending ? "pending" : "successful"
      txns.push({
        userId,
        subscriberId: sub.id,
        customerName: sub.name,
        planName: sub.planName,
        amount: p.amount,
        status,
        nombaRef: ref(),
        failureReason: failed ? FAILURE_REASONS[idx % FAILURE_REASONS.length] : null,
        retryCount: failed ? (idx % 3) + 1 : 0,
        nextRetryDate: failed ? daysFromNow((idx % 4) + 1) : null,
        createdAt: daysAgo((count - c) * 18 + (idx % 7)),
      })
    }
  })

  // Spread a realistic stream of successful charges across the last 30 days so
  // the revenue chart shows a continuous curve rather than isolated spikes.
  const dailyNames = insertedSubs.filter((_, i) => SEED_SUBS[i].status !== "cancelled")
  for (let day = 29; day >= 0; day--) {
    // 1-3 charges per day, weighted by a gentle upward trend.
    const chargesToday = 1 + ((day * 7 + 3) % 3)
    for (let k = 0; k < chargesToday; k++) {
      const sub = dailyNames[(day * 3 + k) % dailyNames.length]
      const p = insertedPlans.find((pp) => pp.id === sub.planId)!
      txns.push({
        userId,
        subscriberId: sub.id,
        customerName: sub.name,
        planName: sub.planName,
        amount: Math.round(p.amount / (p.interval === "annual" ? 12 : p.interval === "quarterly" ? 3 : 1)),
        status: "successful",
        nombaRef: ref(),
        failureReason: null,
        retryCount: 0,
        nextRetryDate: null,
        createdAt: daysAgo(day),
      })
    }
  }

  await db.insert(transaction).values(txns)

  // Activity feed (most recent first via createdAt).
  const activities: (typeof activity.$inferInsert)[] = [
    { userId, type: "subscription.created", message: "Pivo subscribed to the Growth plan", createdAt: daysAgo(0) },
    { userId, type: "charge.failed", message: "Charge failed for Mono — Insufficient funds", createdAt: daysAgo(0) },
    { userId, type: "retry.scheduled", message: "Retry scheduled for Reliance HMO in 2 days", createdAt: daysAgo(1) },
    { userId, type: "access.suspended", message: "Access suspended for Mono after 3 failed retries", createdAt: daysAgo(1) },
    { userId, type: "charge.success", message: "Charge succeeded for Sabi — ₦960,000", createdAt: daysAgo(2) },
    { userId, type: "subscription.created", message: "Vendease subscribed to the Scale plan", createdAt: daysAgo(3) },
    { userId, type: "charge.success", message: "Charge succeeded for Kuda Tech — ₦80,000", createdAt: daysAgo(4) },
    { userId, type: "subscription.cancelled", message: "Brass cancelled their subscription", createdAt: daysAgo(5) },
  ]
  await db.insert(activity).values(activities)
}
