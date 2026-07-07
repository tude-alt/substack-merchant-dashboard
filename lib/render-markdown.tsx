import type { ReactNode } from "react"

export function renderMarkdown(md: string) {
  const lines = md.split("\n")
  const elements: ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let key = 0

  function renderInline(text: string) {
    return text.split(/(`[^`]+`)/g).map((part, i) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          {part.slice(1, -1)}
        </code>
      ) : (
        part
      ),
    )
  }

  function flushList() {
    if (listItems.length === 0) return
    const ListTag = listOrdered ? "ol" : "ul"
    elements.push(
      <ListTag
        key={key++}
        className={
          listOrdered
            ? "list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground"
            : "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground"
        }
      >
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ListTag>,
    )
    listItems = []
    listOrdered = false
  }

  function flushCode() {
    if (!inCode) return
    elements.push(
      <pre
        key={key++}
        className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    )
    inCode = false
    codeLines = []
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) flushCode()
      else {
        flushList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (line.trim() === "---") {
      flushList()
      elements.push(<hr key={key++} className="my-6 border-border" />)
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      elements.push(
        <h1 key={key++} className="text-2xl font-bold tracking-tight text-foreground">
          {line.slice(2)}
        </h1>,
      )
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      elements.push(
        <h2 key={key++} className="mt-10 border-b border-border/60 pb-2 text-lg font-semibold text-foreground first:mt-0">
          {line.slice(3)}
        </h2>,
      )
      continue
    }
    if (line.startsWith("### ")) {
      flushList()
      elements.push(
        <h3 key={key++} className="mt-6 text-base font-semibold text-foreground">
          {line.slice(4)}
        </h3>,
      )
      continue
    }
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (listItems.length > 0 && !listOrdered) flushList()
      listOrdered = true
      listItems.push(orderedMatch[1])
      continue
    }
    if (line.startsWith("- ")) {
      if (listItems.length > 0 && listOrdered) flushList()
      listItems.push(line.slice(2))
      continue
    }
    if (line.trim() === "" || line.startsWith("|")) {
      flushList()
      continue
    }
    flushList()
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-muted-foreground">
        {renderInline(line)}
      </p>,
    )
  }
  flushList()
  flushCode()
  return elements
}
