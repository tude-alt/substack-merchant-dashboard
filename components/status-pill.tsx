import { cn } from "@/lib/utils"

type Tone = "success" | "danger" | "muted" | "warning" | "info"

const TONES: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/15 text-primary border-primary/30",
}

const SUBSCRIBER_STATUS: Record<string, Tone> = {
  active: "success",
  suspended: "danger",
  cancelled: "muted",
}

const CHARGE_STATUS: Record<string, Tone> = {
  successful: "success",
  success: "success",
  failed: "danger",
  pending: "warning",
}

export function StatusPill({
  status,
  kind = "subscriber",
}: {
  status: string
  kind?: "subscriber" | "charge"
}) {
  const map = kind === "charge" ? CHARGE_STATUS : SUBSCRIBER_STATUS
  const tone = map[status] ?? "muted"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONES[tone],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "danger" && "bg-destructive",
          tone === "warning" && "bg-warning",
          tone === "muted" && "bg-muted-foreground",
          tone === "info" && "bg-primary",
        )}
      />
      {status}
    </span>
  )
}
