/** Business categories reused across onboarding and setup API. */
export const MERCHANT_CATEGORIES = [
  "Fintech",
  "E-commerce",
  "Logistics",
  "HealthTech",
  "EdTech",
  "Developer Tools",
  "Media & Entertainment",
  "Other",
] as const

export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number]
