import { getMerchant } from "@/app/actions/merchant"
import { getWebhookDeliveries } from "@/app/actions/webhooks"
import { PageHeader } from "@/components/page-header"
import { ApiKeysSection } from "@/components/settings/api-keys-section"
import { GettingStartedGuide } from "@/components/settings/getting-started-guide"
import { WebhookSection } from "@/components/settings/webhook-section"

export default async function SettingsPage() {
  const [merchant, deliveries] = await Promise.all([
    getMerchant(),
    getWebhookDeliveries(),
  ])

  const selectedEvents = merchant.webhookEvents
    ? merchant.webhookEvents.split(",").filter(Boolean)
    : []

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your API credentials and webhook delivery."
      />
      <div className="space-y-6">
        <GettingStartedGuide />
        <ApiKeysSection
          liveApiKey={merchant.liveApiKey}
          testApiKey={merchant.testApiKey}
        />
        <WebhookSection
          webhookUrl={merchant.webhookUrl}
          selectedEvents={selectedEvents}
          deliveries={deliveries}
        />
      </div>
    </div>
  )
}
