import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { GUIDES, GUIDES_HUB } from "@/lib/docs-guides"

export function GuidesHub() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/15 p-3">
            <GUIDES_HUB.icon className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 space-y-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Integration guides
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {GUIDES_HUB.description} Pick the path that matches how you want to sell
              subscriptions — hosted checkout for speed, or the API for full control.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((guide) => {
          const Icon = guide.icon
          return (
            <Link key={guide.slug} href={guide.href} className="group block h-full">
              <Card className="flex h-full flex-col p-5 transition-all hover:border-primary/30 hover:shadow-elevated">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {guide.readTime}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {guide.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {guide.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    For {guide.audience}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                    Open guide
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
