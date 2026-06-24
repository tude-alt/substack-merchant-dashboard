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

const ICONS: Record<
  string,
  { icon: typeof UserPlus; className: string }
> = {
  "subscription.created": { icon: UserPlus, className: "text-primary" },
  "charge.success": { icon: CheckCircle2, className: "text-success" },
  "charge.failed": { icon: XCircle, className: "text-destructive" },
  "retry.scheduled": { icon: Clock, className: "text-warning" },
  "charge.retried": { icon: RefreshCw, className: "text-primary" },
  "access.suspended": { icon: Ban, className: "text-destructive" },
  "subscription.cancelled": { icon: Ban, className: "text-muted-foreground" },
}

export function ActivityFeed({ items }: { items: Item[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Recent activity
      </h2>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ActivityIcon className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Subscriptions, charges, and retries will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const conf = ICONS[item.type] ?? {
              icon: ActivityIcon,
              className: "text-muted-foreground",
            }
            const Icon = conf.icon
            return (
              <li key={item.id} className="flex gap-3">
                <div className="mt-0.5">
                  <Icon className={`h-4 w-4 ${conf.className}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground text-pretty">
                    {item.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
