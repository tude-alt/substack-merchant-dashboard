import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { MarketingHome } from "@/components/marketing-home"

export default async function RootPage() {
  const session = await getSession()

  // Authenticated users go straight to their dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  // Everyone else sees the public marketing homepage
  return <MarketingHome />
}
