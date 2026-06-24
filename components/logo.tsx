import { cn } from "@/lib/utils"

export function SubStackMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-7 w-7", className)}
      aria-hidden="true"
    >
      {/* Two overlapping rectangles suggesting stacked layers */}
      <rect
        x="4"
        y="9"
        width="17"
        height="14"
        rx="3"
        className="fill-primary"
        opacity="0.55"
      />
      <rect
        x="11"
        y="4"
        width="17"
        height="14"
        rx="3"
        className="fill-primary"
      />
    </svg>
  )
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SubStackMark />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          SubStack
        </span>
      )}
    </div>
  )
}
