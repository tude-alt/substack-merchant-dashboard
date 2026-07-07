# Subflow merchant integration quickstart

This guide walks through integrating any SaaS app with Subflow's recurring billing API — the same flow Axios Health and other merchants use.

## 1. Create a plan

**Dashboard:** Settings → Plans → **New plan**, or copy the plan ID from the Plans table.

**API:**

```bash
curl -X POST "https://YOUR_DOMAIN/api/v1/plans" \
  -H "Authorization: Bearer sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Care Plan",
    "amount": 5000,
    "currency": "NGN",
    "interval": "monthly",
    "retry_attempts": 3,
    "retry_every_days": 3
  }'
```

Response (`201`):

```json
{
  "data": {
    "id": 1,
    "name": "Care Plan",
    "amount": 500000,
    "currency": "NGN",
    "interval": "monthly",
    "retry_attempts": 3,
    "retry_every_days": 3,
    "status": "active"
  }
}
```

`amount` in responses is in **kobo** (minor units). `amount` in create requests is in **naira** (major units), matching the dashboard form.

Copy the plan `id` — you will use it as `SUBFLOW_CARE_PLAN_ID`.

## 2. Set environment variables

```bash
SUBFLOW_API_KEY=sk_test_...          # or sk_live_... in production
SUBFLOW_CARE_PLAN_ID=1               # plan id from step 1
SUBFLOW_WEBHOOK_SECRET=whsec_...     # Settings → Integrations → Webhook secret
SUBFLOW_WEBHOOK_URL=https://your-app.com/webhooks/subflow
```

## 3. Create your first subscriber

**Canonical request body (flat):**

```bash
curl -X POST "https://YOUR_DOMAIN/api/v1/subscribers" \
  -H "Authorization: Bearer sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: onboard-ada-001" \
  -d '{
    "name": "Ada Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
    "plan_id": "1",
    "payment_method": "nomba_checkout_link"
  }'
```

Also accepted (legacy nested shape):

```json
{
  "customer": { "name": "Ada Obi", "email": "ada@example.com", "phone": "+234..." },
  "plan_id": 1
}
```

**Response (`201` created, `200` if same email + plan_id already exists):**

```json
{
  "data": {
    "id": 42,
    "name": "Ada Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
    "plan_id": 1,
    "plan_name": "Care Plan",
    "status": "pending_payment",
    "payment_method": "checkout_link",
    "checkout_url": "https://checkout.nomba.com/...",
    "checkout_link": "https://checkout.nomba.com/...",
    "order_reference": "SUBFLOW-INIT-...",
    "subscription_becomes_active_on": "nomba_payment_success_webhook",
    "subscription_active": false,
    "message": "Subscriber created. Send the customer to checkout_url..."
  }
}
```

**Payment method:** Subflow uses Nomba hosted checkout (card tokenization). Use `payment_method: "nomba_checkout_link"`. The value `nomba_virtual_account` is not supported.

**When does the subscription become active?** After the customer pays at `checkout_url`, Subflow confirms the payment with Nomba — via the hosted success page (`?ref=...`) and/or Nomba's `payment_success` webhook to `/api/webhooks/nomba`. The subscriber is then marked `active` and your app receives `charge.success` if webhooks are configured.

## 4. Look up a subscriber

```bash
# By ID
curl -H "Authorization: Bearer sk_test_YOUR_KEY" \
  "https://YOUR_DOMAIN/api/v1/subscribers/42"

# By email (URL-encoded)
curl -H "Authorization: Bearer sk_test_YOUR_KEY" \
  "https://YOUR_DOMAIN/api/v1/subscribers/by-email/ada%40example.com"
```

## 5. Configure your webhook URL

In **Settings → Integrations**, set your endpoint URL and enable events. Test delivery with **Test connection** or:

```bash
curl -X POST "https://YOUR_DOMAIN/api/v1/webhooks/test" \
  -H "Authorization: Bearer sk_test_YOUR_KEY"
```

## 6. Webhook payload & signature verification

Every webhook POST uses this envelope:

```json
{
  "type": "subscription.created",
  "data": {
    "subscriber_id": 42,
    "email": "ada@example.com",
    "plan_id": 1,
    "amount": 500000
  },
  "timestamp": "2026-07-06T12:00:00.000Z"
}
```

Event types: `subscription.created`, `charge.success`, `charge.failed`, `charge.retried`, `subscription.cancelled`, `test.ping`.

For `charge.failed` and `charge.retried`, `data` also includes:

```json
{
  "attempt": 2,
  "final_attempt": false
}
```

`final_attempt` is `true` only when retry attempts are exhausted.

### Verify `X-Subflow-Signature`

1. Read the **raw request body** as a string (before JSON parsing).
2. Compute `HMAC-SHA256(raw_body, SUBFLOW_WEBHOOK_SECRET)`.
3. Hex-encode the digest and compare to the `X-Subflow-Signature` header (constant-time).

**Node.js example:**

```javascript
import crypto from "crypto"

function verifySubflowWebhook(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader ?? ""))
}
```

## 7. Idempotency

- Re-posting the same `email` + `plan_id` returns the **existing** subscriber with `200`.
- Sending the same `Idempotency-Key` header returns the **original** response (status code and body).

## Error format

All `/api/v1/*` errors return JSON:

```json
{
  "error": "plan_not_found",
  "message": "Plan 99 does not exist for this merchant.",
  "details": { "plan_id": 99 }
}
```

Unknown routes return `404` with `error: "route_not_found"` — never HTML.
