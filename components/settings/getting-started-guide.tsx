import { BookOpen, KeyRound, PlugZap, TerminalSquare } from "lucide-react"
import { Card } from "@/components/ui/card"

export function GettingStartedGuide() {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-md bg-primary/15 p-2">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Getting started</h2>
          <p className="text-sm text-muted-foreground">
            This MVP starts as a clean workspace. Add your own data and connect your keys.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <h3 className="mb-2 font-medium text-foreground">What this MVP covers</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Manage merchant profile details and onboarding state.</li>
            <li>Create and review plans, subscribers, and transactions.</li>
            <li>View payment activity and webhook delivery health.</li>
            <li>Generate test and live API keys for your integrations.</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-foreground">How to add an API key</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open the API Keys section in Settings.</li>
            <li>Copy the test or live key you want to use.</li>
            <li>Store it in your server environment or secret manager.</li>
            <li>Send it in the Authorization header for your requests.</li>
          </ol>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-foreground">
            Create a subscriber via the API
          </h3>
          <p className="mb-2">
            POST to <code className="font-mono text-xs">/api/v1/subscribers</code>{" "}
            with your key. This persists the subscriber and creates a real Nomba
            checkout order (card tokenization enabled) — the response includes
            the live checkout link for the customer&apos;s first payment.
          </p>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-foreground">
{`curl -X POST https://<your-domain>/api/v1/subscribers \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ada Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
    "plan_id": 1
  }'

# 201 -> { "data": { "id": ..., "status": "pending_payment",
#          "checkout_link": "https://checkout.nomba.com/..." } }`}
            </pre>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-foreground">
            <PlugZap className="h-4 w-4" />
            <span className="font-medium">Next step</span>
          </div>
          <p>
            Generate your first key, add your webhook URL, and start bringing in real plans and subscribers.
          </p>
        </div>
      </div>
    </Card>
  )
}
