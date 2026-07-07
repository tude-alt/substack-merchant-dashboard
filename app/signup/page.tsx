import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"
import { AuthLayout } from "@/components/auth-layout"

export default async function SignupPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")

  return (
    <AuthLayout>
      <AuthForm mode="sign-up" />
    </AuthLayout>
  )
}
