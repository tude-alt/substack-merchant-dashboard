# @subflow/sdk

Thin TypeScript client for [Subflow](https://subflow.africa) — Nigerian SaaS recurring billing.

## 5 lines to your first charge

```ts
import { Subflow } from "@subflow/sdk"

const subflow = new Subflow(process.env.SUBFLOW_API_KEY!)
const sub = await subflow.subscribe({ planId: 1, email: "ada@example.com", name: "Ada Obi" })
console.log("Send customer to:", sub.checkout_url)
```

No dashboard setup? Pass an inline plan instead of `planId` — Subflow creates the plan automatically:

```ts
const sub = await subflow.subscribe({
  plan: { name: "Pro", amount: 25000, interval: "monthly" },
  email: "ada@example.com",
  name: "Ada Obi",
})
```

## Zero-code option

Share a hosted checkout link (no SDK, no backend):

```
https://subflow.africa/checkout/1?email=ada@example.com&name=Ada%20Obi
```

Find the link on your Subflow dashboard → **Plans** page.

## Install

```bash
npm install @subflow/sdk
```

Or from this monorepo:

```bash
cd sdk && npm install && npm run build
```

## API

### `new Subflow(apiKey, options?)`

- `apiKey` — `sk_live_...` or `sk_test_...` from Subflow Settings
- `options.baseUrl` — override API host (default `https://subflow.africa`)

### `subflow.subscribe(input)`

Create a subscriber. Requires `email` and `name`.

| Field | Required | Description |
|-------|----------|-------------|
| `planId` | One of `planId` or `plan` | Existing plan ID |
| `plan` | One of `planId` or `plan` | Inline plan — auto-created on first call |
| `email` | Yes | Customer email |
| `name` | Yes | Customer name |
| `phone` | No | Customer phone |

Returns a `Subscriber` with `checkout_url` — send the customer there to complete payment.

### `subflow.getPlans()`

List all plans for your merchant.

### `subflow.getSubscriber(id)`

Fetch a subscriber by ID.

### `subflow.verifyWebhook(rawBody, signatureHeader, secret)`

Verify `X-Subflow-Signature` on inbound webhooks. Use your `whsec_...` secret from Settings.

```ts
import { Subflow } from "@subflow/sdk"

const subflow = new Subflow(process.env.SUBFLOW_API_KEY!)
const ok = subflow.verifyWebhook(
  rawBody,
  request.headers.get("x-subflow-signature"),
  process.env.SUBFLOW_WEBHOOK_SECRET!,
)
```

## Embed widget

Paste on any page — no backend:

```html
<script
  src="https://subflow.africa/embed.js"
  data-subflow-plan="12"
></script>
```

Clicking the button opens hosted checkout in a modal.

## License

MIT
