import Link from "next/link"
import { readFile } from "fs/promises"
import path from "path"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, BookOpen, Link2 } from "lucide-react"
import { renderMarkdown } from "@/lib/render-markdown"

export default async function CheckoutDocsPage() {
  const mdPath = path.join(process.cwd(), "docs", "checkout-embed-guide.md")
  const markdown = await readFile(mdPath, "utf8")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkout & embed guide"
        description="Share checkout links or embed a subscribe button — no backend code required."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/dashboard/docs">
                <BookOpen className="h-4 w-4" />
                API quickstart
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/dashboard/plans">
                <Link2 className="h-4 w-4" />
                Your plans
              </Link>
            </Button>
          </div>
        }
      />
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>
            Markdown source:{" "}
            <code className="font-mono text-xs text-foreground">
              docs/checkout-embed-guide.md
            </code>
          </span>
        </div>
        <article className="space-y-3">{renderMarkdown(markdown)}</article>
      </Card>
      <Button variant="ghost" asChild className="gap-1.5">
        <Link href="/dashboard/settings">
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </Button>
    </div>
  )
}
