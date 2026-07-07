# Subflow usage examples

Examples for **SaaS founders** (no code), **developers** (API/SDK), and **customers** (paying via checkout).

---

## For SaaS founders — no code required

### 1. Sign up and complete setup

1. Create an account at `/signup` — you'll receive a **6-digit verification code** by email.
2. Run the setup wizard: business name, pricing tiers, retry rules.
3. Copy your **checkout link** from **Plans** (e.g. `https://yoursite.subflow.africa/checkout/42`).

### 2. Share your checkout link

Send the link by email, WhatsApp, or social media:

```
https://substack-merchant-dashboard.vercel.app/checkout/42
```

Pre-fill customer details:

```
https://yoursite/checkout/42?email=ada@example.com&name=Ada+Obi&coupon=LAUNCH10
```

### 3. Embed a subscribe button on your website

```html
<div data-subflow-checkout="42"></div>
<script
  src="https://yoursite.subflow.africa/embed.js"
  data-subflow-plan="42"
  data-subflow-label="Subscribe now"
  data-subflow-mode="modal"
></script>
```

### 4. Monitor your dashboard

- **Subscribers** — see who paid vs who is still awaiting payment. Use **Verify payment** if Nomba confirmed but the dashboard lags.
- **Transactions** — every successful charge.
- **Settings** — register the Nomba webhook URL and set alert email for payment notifications.

---

## For developers — REST API

### Create a subscriber (server-side)

```bash
curl -X POST "https://yoursite.subflow.africa/api/v1/subscribers" \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: customer-ada-001" \
  -d '{
    "name": "Ada Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
    "plan_id": 42
  }'
```

Response includes `checkout_url` — redirect your customer there for first payment.

### Check payment status (polling)

```bash
curl -H "Authorization: Bearer sk_live_YOUR_KEY" \
  "https://yoursite.subflow.africa/api/v1/subscribers/99/payment-status"
```

```json
{
  "data": {
    "subscriber_id": 99,
    "status": "active",
    "subscription_active": true,
    "order_reference": "SUBFLOW-INIT-..."
  }
}
```

### Handle webhooks

```javascript
import crypto from "crypto"

export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-subflow-signature")
  const expected = crypto
    .createHmac("sha256", process.env.SUBFLOW_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex")

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature ?? ""))) {
    return new Response("Invalid signature", { status: 401 })
  }

  const event = JSON.parse(rawBody)
  if (event.type === "charge.success") {
    // Grant access in your app
    const { subscriber_id, email, plan_id } = event.data
  }

  return Response.json({ received: true })
}
```

---

## For developers — TypeScript SDK

```typescript
import { Subflow } from "@subflow/sdk"

const subflow = new Subflow(process.env.SUBFLOW_API_KEY!)

// Create subscriber and get checkout URL
const { data } = await subflow.subscribers.create({
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348012345678",
  planId: 42,
})

// Redirect customer to data.checkout_url

// Later: check if they paid
const status = await subflow.subscribers.paymentStatus(data.id)
if (status.subscription_active) {
  console.log("Access granted")
}
```

### Auto-provision a plan inline

```typescript
const { data } = await subflow.subscribers.create({
  name: "Ada Obi",
  email: "ada@example.com",
  plan: {
    name: "Pro",
    amount: 15000,
    currency: "NGN",
    interval: "monthly",
  },
})
```

---

## For developers — Next.js checkout redirect

```typescript
// app/subscribe/page.tsx
import { redirect } from "next/navigation"

export default function SubscribePage() {
  // Hosted checkout — zero backend code in your app
  redirect("https://yoursite.subflow.africa/checkout/42?email=user@example.com")
}
```

---

## For customers — paying via checkout

1. Open the checkout link from your SaaS provider.
2. Enter name and email — **you are not charged yet**.
3. Click **Continue to payment** → complete card payment on Nomba.
4. Land on the success page — subscription activates and your provider's dashboard updates.
5. Receive a **payment receipt email** and optional **customer portal** link to manage or cancel.

---

## Email notifications (merchants)

Subflow sends email from **axiosbuild@gmail.com** (Gmail) when configured:

| Email | When |
|-------|------|
| Verification code | Sign-up (6-digit OTP) |
| Welcome | New merchant account |
| Payment receipt | Customer's first or recurring charge |
| Dunning | Failed payment before retry |
| Merchant alert | Payment success/failure (if alert email set in Settings) |

Configure in Vercel:

```bash
GMAIL_USER=axiosbuild@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
EMAIL_FROM_NAME=Subflow
```

Use a [Google App Password](https://myaccount.google.com/apppasswords) (2FA required on the Google account).

---

## Quick reference

| Goal | Path |
|------|------|
| Share checkout only | Plans → copy link |
| Embed button | `embed.js` + `data-subflow-plan` |
| Full API control | `/dashboard/docs/api` |
| Checkout guide | `/dashboard/docs/checkout` |
| These examples | `/examples` or `/dashboard/docs/examples` |
| System status | `/status` |
