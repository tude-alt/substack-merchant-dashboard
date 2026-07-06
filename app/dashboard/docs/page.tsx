import Link from "next/link"
import type { ReactNode } from "react"
import { readFile } from "fs/promises"
import path from "path"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, BookOpen } from "lucide-react"

function renderMarkdown(md: string) {
  const lines = md.split("\n")
  const elements: ReactNode[] = []
  let inCode = false
  let codeLang = ""
  let codeLines: string[] = []
  let listItems: string[] = []
  let key = 0

  function flushList() {
    if (listItems.length === 0) return
    elements.push(
      <ul key={key++} className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {listItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  function flushCode() {
    if (!inCode) return
    elements.push(
      <pre
        key={key++}
        className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    )
    inCode = false
    codeLines = []
    codeLang = ""
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) flushCode()
      else {
        flushList()
        inCode = true
        codeLang = line.slice(3).trim()
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      elements.push(
        <h1 key={key++} className="text-2xl font-semibold tracking-tight text-foreground">
          {line.slice(2)}
        </h1>,
      )
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      elements.push(
        <h2 key={key++} className="mt-8 text-lg font-semibold text-foreground">
          {line.slice(3)}
        </h2>,
      )
      continue
    }
    if (line.startsWith("### ")) {
      flushList()
      elements.push(
        <h3 key={key++} className="mt-6 text-base font-medium text-foreground">
          {line.slice(4)}
        </h3>,
      )
      continue
    }
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2))
      continue
    }
    if (line.trim() === "") {
      flushList()
      continue
    }
    flushList()
    const withCode = line.split(/(`[^`]+`)/g).map((part, i) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      ) : (
        part
      ),
    )
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-muted-foreground">
        {withCode}
      </p>,
    )
  }
  flushList()
  flushCode()
  return elements
}

export default async function DocsPage() {
  const mdPath = path.join(process.cwd(), "docs", "merchant-quickstart.md")
  const markdown = await readFile(mdPath, "utf8")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration quickstart"
        description="End-to-end guide for connecting your app to Subflow."
        action={
          <Button variant="outline" asChild className="gap-1.5">
            <Link href="/dashboard/settings">
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
        }
      />
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>
            Markdown source:{" "}
            <code className="font-mono text-xs text-foreground">docs/merchant-quickstart.md</code>
          </span>
        </div>
        <article className="space-y-3">{renderMarkdown(markdown)}</article>
      </Card>
    </div>
  )
}
