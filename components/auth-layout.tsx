import { Logo } from "@/components/logo"
import { Check } from "lucide-react"

const BULLETS = [
  "Hosted checkout links — zero backend code",
  "Auto-setup creates plans & API keys",
  "Nomba-powered NGN payments",
  "Signed webhooks & retry logic",
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Brand panel */}
      <div className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-indigo-500 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight text-white text-balance">
            Billing infrastructure your Nigerian customers can actually pay through
          </h2>
          <ul className="space-y-3">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3 text-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200/80">
          Powered by Nomba · Built for SaaS founders in Nigeria
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-mesh px-6 py-12">
        {children}
      </div>
    </div>
  )
}
