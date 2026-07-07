import type { LucideIcon } from "lucide-react"
import { BookOpen, Code2, Link2, TerminalSquare } from "lucide-react"

export type Guide = {
  slug: string
  href: string
  title: string
  description: string
  audience: string
  readTime: string
  sourceFile: string
  icon: LucideIcon
}

export const GUIDES: Guide[] = [
  {
    slug: "api",
    href: "/dashboard/docs/api",
    title: "API quickstart",
    description:
      "Create plans, subscribe customers, and handle webhooks with the REST API.",
    audience: "Developers",
    readTime: "8 min",
    sourceFile: "docs/merchant-quickstart.md",
    icon: TerminalSquare,
  },
  {
    slug: "checkout",
    href: "/dashboard/docs/checkout",
    title: "Checkout & embed",
    description:
      "Share hosted checkout links or embed a subscribe button — no backend required.",
    audience: "Founders",
    readTime: "5 min",
    sourceFile: "docs/checkout-embed-guide.md",
    icon: Link2,
  },
  {
    slug: "examples",
    href: "/dashboard/docs/examples",
    title: "Usage examples",
    description:
      "Copy-paste flows for founders, developers, and customers — email, API, and portal.",
    audience: "Everyone",
    readTime: "6 min",
    sourceFile: "docs/usage-examples.md",
    icon: Code2,
  },
]

export const GUIDES_HUB = {
  href: "/dashboard/docs",
  title: "Guides",
  description: "Everything you need to integrate Subflow — from no-code checkout to full API setup.",
  icon: BookOpen,
} as const

export function guideFromPath(pathname: string): Guide | null {
  const match = GUIDES.find((g) => pathname === g.href || pathname.startsWith(g.href + "/"))
  return match ?? null
}
