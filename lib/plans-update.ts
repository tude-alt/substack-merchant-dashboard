import { db } from "@/lib/db"
import { plan } from "@/lib/db/schema"
import { validatePlanInput, type PlanInput } from "@/lib/plans"
import { and, eq } from "drizzle-orm"

export async function updatePlanForUser(userId: string, planId: number, input: PlanInput) {
  const validationError = validatePlanInput(input)
  if (validationError) {
    throw new Error(validationError)
  }

  const [updated] = await db
    .update(plan)
    .set({
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
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)))
    .returning()

  if (!updated) throw new Error("Plan not found.")
  return updated
}
