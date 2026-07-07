"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

export function SubflowMark({ className }: { className?: string }) {
  const gradId = useId().replace(/:/g, "")

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8 shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28">
          <stop stopColor="#4338ca" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect x="4" y="18" width="14" height="10" rx="3" fill={`url(#${gradId})`} opacity="0.35" />
      <rect x="10" y="12" width="14" height="10" rx="3" fill={`url(#${gradId})`} opacity="0.6" />
      <rect x="16" y="6" width="14" height="10" rx="3" fill={`url(#${gradId})`} />
      <path
        d="M8 24c4-2 8-2 12 0"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  )
}

export function Logo({
  className,
  showWordmark = true,
  variant = "default",
}: {
  className?: string
  showWordmark?: boolean
  variant?: "default" | "light"
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SubflowMark />
      {showWordmark && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            variant === "light" ? "text-white" : "text-foreground",
          )}
        >
          Subflow
        </span>
      )}
    </div>
  )
}
