"use server"

import { getUserId } from "@/lib/session"
import { getMerchant } from "@/app/actions/merchant"
import {
  runMerchantSetup,
  type MerchantSetupInput,
  type MerchantSetupResult,
} from "@/lib/merchant-setup"
import { revalidatePath } from "next/cache"

export async function runSetupFromWizard(
  input: MerchantSetupInput,
): Promise<MerchantSetupResult> {
  const userId = await getUserId()
  await getMerchant()
  const result = await runMerchantSetup(userId, input)
  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return result
}
