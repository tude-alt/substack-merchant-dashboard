import Link from "next/link"
import { readFile } from "fs/promises"
import path from "path"
import { PageHeader } from "@/components/page-header"
import { DocsArticle } from "@/components/docs/docs-article"
import { Button } from "@/components/ui/button"
import { renderMarkdown } from "@/lib/render-markdown"
import { GUIDES } from "@/lib/docs-guides"

const guide = GUIDES.find((g) => g.slug === "api")!

export default async function ApiDocsPage() {
  const mdPath = path.join(process.cwd(), guide.sourceFile)
  const markdown = await readFile(mdPath, "utf8")

  return (
    <>
      <PageHeader title={guide.title} description={guide.description} />
      <DocsArticle
        sourceFile={guide.sourceFile}
        footer={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings">Open Settings</Link>
          </Button>
        }
      >
        {renderMarkdown(markdown)}
      </DocsArticle>
    </>
  )
}
