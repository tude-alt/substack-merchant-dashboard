import { PageHeader } from "@/components/page-header"
import { GuidesHub } from "@/components/docs/guides-hub"
import { GUIDES_HUB } from "@/lib/docs-guides"

export default function DocsHubPage() {
  return (
    <>
      <PageHeader title={GUIDES_HUB.title} description={GUIDES_HUB.description} />
      <GuidesHub />
    </>
  )
}
