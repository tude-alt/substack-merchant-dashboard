import type React from "react"

import { DocsNav } from "@/components/docs/docs-nav"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <DocsNav />
      {children}
    </div>
  )
}
