import { getMerchant } from "@/app/actions/merchant"
import { getPlansWithStats } from "@/app/actions/plans"
import { getWebhookDeliveries } from "@/app/actions/webhooks"
import { PageHeader } from "@/components/page-header"
import { IntegrationsSection } from "@/components/settings/integrations-section"
import { getAppUrl } from "@/lib/billing"

export default async function SettingsPage() {
  const [merchant, deliveries, plans] = await Promise.all([
    getMerchant(),
    getWebhookDeliveries(),
    getPlansWithStats(),
  ])

  const selectedEvents = merchant.webhookEvents
    ? merchant.webhookEvents.split(",").filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="API credentials, plan IDs, webhooks, and integration testing."
      />
      <IntegrationsSection
        liveApiKey={merchant.liveApiKey}
        testApiKey={merchant.testApiKey}
        webhookSecret={merchant.webhookSecret}
        webhookUrl={merchant.webhookUrl}
        selectedEvents={selectedEvents}
        nombaWebhookUrl={`${getAppUrl()}/api/webhooks/nomba`}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          amount: p.amount,
          interval: p.interval,
        }))}
        deliveries={deliveries}
      />
    </div>
  )
}
