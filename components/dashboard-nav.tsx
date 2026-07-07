"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Layers,
  Receipt,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { signOut } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/dashboard/subscribers", label: "Subscribers", shortLabel: "Subs", icon: Users },
  { href: "/dashboard/plans", label: "Plans", shortLabel: "Plans", icon: Layers },
  { href: "/dashboard/transactions", label: "Transactions", shortLabel: "Txns", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
]

const SECONDARY = [{ href: "/dashboard/docs", label: "Guides", icon: BookOpen }]

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

export function Sidebar({
  merchantName,
  email,
}: {
  merchantName: string
  email: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const initials =
    merchantName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="flex flex-1 flex-col px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Resources
        </p>
        <nav className="flex flex-col gap-0.5">
          {SECONDARY.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-500 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{merchantName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function MobileTopBar() {
  const pathname = usePathname()
  const onDocs = pathname.startsWith("/dashboard/docs")
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md md:hidden">
      <Link href="/dashboard">
        <Logo />
      </Link>
      <Link
        href="/dashboard/docs"
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          onDocs
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <BookOpen className="h-4 w-4" />
        Guides
      </Link>
    </header>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
            <span className="max-w-[3.25rem] truncate sm:max-w-none">{item.shortLabel ?? item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
