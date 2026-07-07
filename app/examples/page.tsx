import Link from "next/link"
import { readFile } from "fs/promises"
import path from "path"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { renderMarkdown } from "@/lib/render-markdown"

export default async function PublicExamplesPage() {
  const mdPath = path.join(process.cwd(), "docs", "usage-examples.md")
  const markdown = await readFile(mdPath, "utf8")

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="space-y-3 rounded-2xl border border-border bg-card p-8 shadow-card">
          {renderMarkdown(markdown)}
        </article>
      </main>
    </div>
  )
}
