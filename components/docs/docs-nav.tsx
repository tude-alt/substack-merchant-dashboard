"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GUIDES, GUIDES_HUB } from "@/lib/docs-guides"
import { cn } from "@/lib/utils"

export function DocsNav() {
  const pathname = usePathname()
  const onHub = pathname === GUIDES_HUB.href

  return (
    <div className="space-y-4">
      <nav
        aria-label="Guide sections"
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          href={GUIDES_HUB.href}
          className={cn(
            "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
            onHub
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          Overview
        </Link>
        {GUIDES.map((guide) => {
          const active = pathname === guide.href || pathname.startsWith(guide.href + "/")
          const Icon = guide.icon
          return (
            <Link
              key={guide.slug}
              href={guide.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{guide.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
