import type { ReactNode } from "react"

export function DocsArticle({
  children,
  sourceFile,
  footer,
}: {
  children: ReactNode
  sourceFile?: string
  footer?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <article className="docs-content space-y-4 p-4 sm:p-6 md:p-8">{children}</article>
      {(sourceFile || footer) && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
          {sourceFile && (
            <span>
              Source:{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {sourceFile}
              </code>
            </span>
          )}
          {footer}
        </div>
      )}
    </div>
  )
}
