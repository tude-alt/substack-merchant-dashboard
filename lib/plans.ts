import { db } from "@/lib/db"
import { plan } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

export type PlanInput = {
  name: string
  description: string
  amount: number // major currency units (naira); stored as kobo
  currency: string
  interval: string
  trialDays: number
  retryAttempts: number
  retryIntervalDays: number
  successRedirectUrl?: string
}

export type PlanRow = typeof plan.$inferSelect

const VALID_INTERVALS = new Set(["monthly", "quarterly", "annual"])

export function formatPlanForApi(p: PlanRow) {
  return {
    id: p.id,
    name: p.name,
    amount: p.amount,
    currency: p.currency,
    interval: p.interval,
    retry_attempts: p.retryAttempts,
    retry_every_days: p.retryIntervalDays,
    success_redirect_url: p.successRedirectUrl || null,
    status: "active" as const,
  }
}

export async function listPlansForUser(userId: string) {
  return db
    .select()
    .from(plan)
    .where(eq(plan.userId, userId))
    .orderBy(desc(plan.createdAt))
}

export async function getPlanForUser(userId: string, planId: number) {
  const [row] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)))
    .limit(1)
  return row ?? null
}

export function validatePlanInput(input: PlanInput): string | null {
  if (!input.name.trim()) return "name is required."
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return "amount must be a non-negative number."
  }
  if (!input.currency.trim()) return "currency is required."
  if (!VALID_INTERVALS.has(input.interval)) {
    return `interval must be one of: ${[...VALID_INTERVALS].join(", ")}.`
  }
  if (!Number.isInteger(input.trialDays) || input.trialDays < 0) {
    return "trial_days must be a non-negative integer."
  }
  if (!Number.isInteger(input.retryAttempts) || input.retryAttempts < 0) {
    return "retry_attempts must be a non-negative integer."
  }
  if (!Number.isInteger(input.retryIntervalDays) || input.retryIntervalDays < 1) {
    return "retry_every_days must be an integer >= 1."
  }
  return null
}

/** Shared plan creation used by dashboard actions and the public API. */
export async function createPlanForUser(userId: string, input: PlanInput) {
  const validationError = validatePlanInput(input)
  if (validationError) {
    throw new PlanValidationError(validationError)
  }

  const [created] = await db
    .insert(plan)
    .values({
      userId,
      name: input.name.trim(),
      description: input.description.trim(),
      amount: Math.round(input.amount * 100),
      currency: input.currency.trim(),
      interval: input.interval,
      trialDays: input.trialDays,
      retryAttempts: input.retryAttempts,
      retryIntervalDays: input.retryIntervalDays,
      successRedirectUrl: (input.successRedirectUrl ?? "").trim(),
    })
    .returning()

  return created
}

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PlanValidationError"
  }
}

/** Parse plan fields from a JSON API body (snake_case). */
export function parsePlanInputFromBody(body: Record<string, unknown>): PlanInput {
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    amount: Number(body.amount),
    currency: typeof body.currency === "string" ? body.currency.trim() : "NGN",
    interval: typeof body.interval === "string" ? body.interval.trim() : "monthly",
    trialDays:
      body.trial_days !== undefined
        ? Number(body.trial_days)
        : body.trialDays !== undefined
          ? Number(body.trialDays)
          : 0,
    retryAttempts:
      body.retry_attempts !== undefined
        ? Number(body.retry_attempts)
        : body.retryAttempts !== undefined
          ? Number(body.retryAttempts)
          : 3,
    retryIntervalDays:
      body.retry_every_days !== undefined
        ? Number(body.retry_every_days)
        : body.retryIntervalDays !== undefined
          ? Number(body.retryIntervalDays)
          : 3,
    successRedirectUrl:
      typeof body.success_redirect_url === "string"
        ? body.success_redirect_url.trim()
        : typeof body.successRedirectUrl === "string"
          ? body.successRedirectUrl.trim()
          : "",
  }
}
