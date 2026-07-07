import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import {
  UserPlus,
  XCircle,
  Clock,
  Ban,
  CheckCircle2,
  RefreshCw,
  Activity as ActivityIcon,
} from "lucide-react"

type Item = { id: number; type: string; message: string; createdAt: Date }

const ICONS: Record<string, { icon: typeof UserPlus; bg: string; fg: string }> = {
  "subscription.created": { icon: UserPlus, bg: "bg-primary/10", fg: "text-primary" },
  "charge.success": { icon: CheckCircle2, bg: "bg-emerald-500/10", fg: "text-emerald-600" },
  "charge.failed": { icon: XCircle, bg: "bg-destructive/10", fg: "text-destructive" },
  "retry.scheduled": { icon: Clock, bg: "bg-amber-500/10", fg: "text-amber-600" },
  "charge.retried": { icon: RefreshCw, bg: "bg-primary/10", fg: "text-primary" },
  "access.suspended": { icon: Ban, bg: "bg-destructive/10", fg: "text-destructive" },
  "subscription.cancelled": { icon: Ban, bg: "bg-muted", fg: "text-muted-foreground" },
}

export function ActivityFeed({ items }: { items: Item[] }) {
  return (
    <Card className="border-border/80 p-0 shadow-card ring-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent activity
        </h2>
      </div>
      <div className="p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <ActivityIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Subscriptions, charges, and retries will show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const conf = ICONS[item.type] ?? {
                icon: ActivityIcon,
                bg: "bg-muted",
                fg: "text-muted-foreground",
              }
              const Icon = conf.icon
              return (
                <li key={item.id} className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${conf.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${conf.fg}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground text-pretty">{item.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
