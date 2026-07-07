import Link from "next/link"
import { readFile } from "fs/promises"
import path from "path"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookOpen, Link2, Code2 } from "lucide-react"
import { renderMarkdown } from "@/lib/render-markdown"

export default async function ExamplesDocsPage() {
  const mdPath = path.join(process.cwd(), "docs", "usage-examples.md")
  const markdown = await readFile(mdPath, "utf8")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage examples"
        description="Copy-paste examples for founders, developers, and customers."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/dashboard/docs/checkout">
                <Link2 className="h-4 w-4" />
                Checkout guide
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/dashboard/docs">
                <BookOpen className="h-4 w-4" />
                API quickstart
              </Link>
            </Button>
          </div>
        }
      />
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Code2 className="h-4 w-4" />
          <span>
            Also public at{" "}
            <Link href="/examples" className="text-primary hover:underline">
              /examples
            </Link>
            {" · "}
            Source: <code className="font-mono text-xs">docs/usage-examples.md</code>
          </span>
        </div>
        <article className="space-y-3">{renderMarkdown(markdown)}</article>
      </Card>
    </div>
  )
}
