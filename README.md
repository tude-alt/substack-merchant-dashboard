# Subflow — recurring billing for Nigerian SaaS

**Nomba Hackathon submission · Team Axios**

Subflow is a merchant dashboard and billing API that lets Nigerian SaaS teams go from signup to first charge in one session. Share a hosted checkout link, embed a subscribe button, or integrate via REST — all powered by [Nomba](https://nomba.com) for card payments and tokenized recurring charges in NGN.

**Live demo:** [substack-merchant-dashboard.vercel.app](https://substack-merchant-dashboard.vercel.app)

**One-line pitch:** Recurring billing for Nigerian SaaS — checkout link to first charge in minutes.

---

## Team Axios · Nomba Hackathon

Built for the **Nomba hackathon** by **Team Axios** to demonstrate end-to-end subscription billing for Nigerian SaaS:

- Hosted checkout with Nomba card payments (no merchant backend required)
- Tokenized recurring charges and configurable retry logic
- Real-time dashboard, webhooks, and merchant alerts
- Gmail-powered verification codes, receipts, and dunning emails

Contact: [axiosbuild@gmail.com](mailto:axiosbuild@gmail.com)

---

## Who is this for?

| Role | What you do | Where to start |
|------|-------------|----------------|
| **Customer** | Pay for a subscription via a checkout link from your merchant | [Customer setup](#for-customers-paying-a-subscription) |
| **Merchant** | Create plans, share checkout links, monitor subscribers & MRR | [Merchant setup](#for-merchants-selling-subscriptions) |
| **Developer** | Integrate Subflow via REST API, webhooks, and server-side flows | [Developer setup](#for-developers-integrating-via-api) |

---

## For customers (paying a subscription)

You do **not** need a Subflow account. Your merchant sends you a checkout link.

### 1. Open the checkout link

Your merchant shares a URL like:

```
https://substack-merchant-dashboard.vercel.app/checkout/42
```

Optional pre-filled details:

```
https://substack-merchant-dashboard.vercel.app/checkout/42?email=you@example.com&name=Ada+Obi&phone=%2B2348012345678
```

### 2. Enter your details and pay

1. Fill in name, email, and phone.
2. Apply a coupon code if your merchant gave you one.
3. You are redirected to **Nomba** to pay with your card.
4. After payment, the success page confirms your subscription automatically.

### 3. After payment

- You receive a **payment receipt** by email (if the merchant has email configured).
- Your subscription appears as **Active** on the merchant's dashboard.
- Your merchant may send a **customer portal link** (`/portal/{token}`) where you can view billing history.

### If payment looks stuck

Wait a few seconds — the success page retries confirmation with Nomba. If the merchant's dashboard still shows "Pending payment", ask them to click **Verify payment** on your subscriber row.

---

## For merchants (selling subscriptions)

### 1. Create your account

1. Go to [/signup](https://substack-merchant-dashboard.vercel.app/signup).
2. Enter your email and password.
3. Check your inbox for a **6-digit verification code** (sent from `axiosbuild@gmail.com` when Gmail is configured).
4. Complete the **setup wizard**: business name, plan tiers, retry rules.

### 2. Create a plan

**Dashboard → Plans → New plan**

Set name, amount (in kobo), billing interval, and retry settings. Each plan gets a **checkout link** you can copy and share.

### 3. Share checkout (no code)

| Method | How |
|--------|-----|
| **Link** | Copy checkout URL from Plans and send via email, WhatsApp, or social |
| **Embed** | Add the embed script to your website (see [Checkout guide](https://substack-merchant-dashboard.vercel.app/dashboard/docs/checkout)) |
| **Pre-fill** | Append `?email=…&name=…&phone=…` to the checkout URL |

### 4. Configure Nomba webhook (required for reliable activation)

**Dashboard → Settings → Integrations**

Copy the **Nomba inbound webhook URL** and register it in your [Nomba developer dashboard](https://developer.nomba.com) under Webhook Setup.

Without this webhook, payments can still confirm via the checkout success page or **Verify payment** on pending subscribers — but the webhook is recommended for production.

### 5. Run your dashboard day-to-day

| Screen | Purpose |
|--------|---------|
| **Dashboard** | MRR, revenue chart, failed payments, activity feed |
| **Subscribers** | View customers, verify payments, charge now, pause/cancel, resend checkout & portal links |
| **Plans** | Create and edit plans, copy checkout links |
| **Transactions** | Full payment history with filters |
| **Settings** | API keys, webhooks, branding (logo + color), alert email, Slack webhook |
| **Guides** | Integration docs — API, checkout embed, usage examples |

### 6. Optional merchant features

- **Branded checkout** — upload logo and brand color in Settings
- **Coupons** — discount codes at checkout (`?coupon=CODE`)
- **Email alerts** — payment and failure notifications to your alert email
- **Customer portal** — copy portal links from Subscribers for self-service billing history
- **CSV export** — export subscribers and transactions from dashboard tables

---

## For developers (integrating via API)

### Quick start

1. **Sign up** and complete onboarding (see [Merchant setup](#for-merchants-selling-subscriptions)).
2. **Copy your API key** from Settings → API Keys (`sk_test_…` or `sk_live_…`).
3. **Create a subscriber** — returns a Nomba checkout URL for the customer's first payment.

```bash
curl -X POST "https://substack-merchant-dashboard.vercel.app/api/v1/subscribers" \
  -H "Authorization: Bearer sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
    "plan_id": 42
  }'
```

Response (`201`):

```json
{
  "data": {
    "id": 99,
    "status": "pending_payment",
    "checkout_link": "https://checkout.nomba.com/...",
    "plan_id": 42
  }
}
```

Redirect your customer to `checkout_link` for first payment. After Nomba confirms payment, the subscriber becomes **active** and MRR updates.

### Poll payment status

```bash
curl -H "Authorization: Bearer sk_test_YOUR_KEY" \
  "https://substack-merchant-dashboard.vercel.app/api/v1/subscribers/99/payment-status"
```

### Webhooks (outbound — Subflow → your app)

Configure your webhook URL and events in Settings. Subflow signs payloads with your webhook secret.

Events: `subscription.created`, `charge.success`, `charge.failed`, `charge.retried`, `subscription.cancelled`

### Webhooks (inbound — Nomba → Subflow)

Register `https://your-domain.vercel.app/api/webhooks/nomba` in the Nomba dashboard. Every payment event is verified against Nomba's transaction API before state changes.

### Guides & reference

| Guide | URL |
|-------|-----|
| All guides (hub) | `/dashboard/docs` |
| API quickstart | `/dashboard/docs/api` |
| Checkout & embed | `/dashboard/docs/checkout` |
| Usage examples | `/dashboard/docs/examples` |
| Public examples | `/examples` |
| System status | `/status` |

Source docs live in `docs/merchant-quickstart.md`, `docs/checkout-embed-guide.md`, and `docs/usage-examples.md`.

### API surface

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/plans` | GET, POST | List / create plans |
| `/api/v1/plans/{id}` | GET, PATCH | Get / update plan |
| `/api/v1/subscribers` | POST | Create subscriber + checkout |
| `/api/v1/subscribers/{id}` | GET | Get subscriber |
| `/api/v1/subscribers/{id}/payment-status` | GET | Poll first-payment status |
| `/api/v1/subscribers/by-email/{email}` | GET | Lookup by email |
| `/api/v1/setup` | POST | Provision merchant (onboarding) |
| `/api/v1/webhooks/test` | POST | Send test webhook |

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database

### Setup

```bash
git clone https://github.com/tude-alt/substack-merchant-dashboard.git
cd substack-merchant-dashboard
pnpm install
```

Create `.env.local`:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/subflow
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Nomba (required for real payments — no mock fallback)
NOMBA_CLIENT_ID=your_client_id
NOMBA_PRIVATE_KEY=your_client_secret
NOMBA_ACCOUNT_ID=your_account_id
# NOMBA_SUB_ACCOUNT_ID=...
# NOMBA_BASE_URL=https://sandbox.nomba.com

CRON_SECRET=replace-with-a-long-random-secret

# Gmail (verification codes, receipts, alerts)
GMAIL_USER=axiosbuild@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
EMAIL_FROM_NAME=Subflow
```

Run migration and start dev server:

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Connect the GitHub repo to Vercel.
2. Add environment variables (see below).
3. Deploy — migrations run automatically on build (`scripts/migrate.mjs --build`).

### Required environment variables

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

NOMBA_CLIENT_ID=...
NOMBA_PRIVATE_KEY=...
NOMBA_ACCOUNT_ID=...
# NOMBA_SUB_ACCOUNT_ID=...
# NOMBA_BASE_URL=https://sandbox.nomba.com
# NOMBA_WEBHOOK_SIGNATURE_KEY=...

CRON_SECRET=replace-with-a-long-random-secret

GMAIL_USER=axiosbuild@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
EMAIL_FROM_NAME=Subflow

# Optional Resend fallback
# RESEND_API_KEY=re_...
# RESEND_FROM=Subflow <billing@yourdomain.com>
```

### Post-deploy checklist

- [ ] Run `DATABASE_URL=... node scripts/migrate.mjs` if not using build-time migration
- [ ] Register Nomba webhook URL in Nomba dashboard
- [ ] Set `GMAIL_APP_PASSWORD` for live email (Google App Password, not your login password)
- [ ] Test signup OTP, checkout payment, and dashboard MRR update
- [ ] Configure Vercel cron for `/api/cron/billing` (daily at 06:00 UTC — see `vercel.json`)

---

## Architecture overview

```
Customer → Hosted checkout (/checkout/{plan_id})
         → Nomba card payment
         → Success page + webhook confirm
         → Subscriber active, MRR updated, receipt emailed

Merchant → Dashboard (plans, subscribers, transactions)
         → Settings (API keys, webhooks, branding)
         → Guides (/dashboard/docs)

Developer → REST API (/api/v1/*)
          → Outbound webhooks to your app
          → Cron billing for recurring tokenized charges
```

**Stack:** Next.js 16 · React 19 · PostgreSQL · Drizzle ORM · Better Auth · Nomba Payments · Gmail (Nodemailer)

---

## Project structure

```
app/
  checkout/          # Hosted checkout + success page
  dashboard/         # Merchant dashboard + guides
  portal/            # Customer self-service portal
  api/v1/            # REST API
  api/webhooks/nomba # Inbound Nomba webhook
docs/                # Markdown guides (rendered in dashboard)
lib/                 # Billing, Nomba, email, auth, DB
components/          # UI components
```

---

## License

Built for the Nomba hackathon by **Team Axios**. All rights reserved.
