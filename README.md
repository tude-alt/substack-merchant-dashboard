# substack-merchant-dashboard

Substack Merchant Dashboard is an MVP built for the Nomba hackathon. It gives merchants a clean, fast way to manage subscriptions, payments, and webhook-driven commerce workflows from a single dashboard. The experience is intentionally kept virgin at first use so teams can add their own plans, subscribers, transactions, and credentials without any preloaded demo content.

## MVP focus

This version helps a merchant:

- onboard a business profile and connect payment infrastructure
- create and manage recurring plans
- track subscribers and transaction activity
- review webhook delivery logs and configure events
- generate API keys for test and live environments

## What is different in this MVP?

- No seed data is injected on first login or onboarding.
- The dashboard starts empty until the merchant adds their own real content.
- Settings includes a guide for new users explaining how to add keys and start integrating.

## Getting started

1. Install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm dev
```

3. Open http://localhost:3000 and sign in or create an account.

## First-run experience

When a new merchant signs up:

- the workspace starts with no seed plans, subscribers, or transactions
- the user can complete onboarding and then add their own data manually
- the Settings screen displays a getting-started guide and API key management

## API keys

Use the API Keys section in Settings to generate and manage your keys.

- Live key: use for production traffic
- Test key: use for sandbox or staging work

### Example: Python access

```python
import os
import requests

api_key = os.getenv("SUBSTACK_API_KEY", "your-key-here")
url = "https://your-domain.example.com/api/merchant"

response = requests.get(
    url,
    headers={"Authorization": f"Bearer {api_key}"},
    timeout=10,
)

print(response.status_code)
print(response.text)
```

## Vercel deployment

This project is ready to deploy on Vercel. Every push to the main branch can trigger a fresh deployment automatically when the GitHub repository is connected to Vercel.

### Required environment variables

Add these in your Vercel project settings:

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# Nomba credentials (required for charging — there is NO mock fallback).
# Obtain from the Nomba dashboard: Developer -> API Keys.
NOMBA_CLIENT_ID=...        # Nomba client_id
NOMBA_PRIVATE_KEY=...      # Nomba client_secret ("private key")
NOMBA_ACCOUNT_ID=...       # Nomba parent accountId (sent in the accountId header)
# Optional: outlet/sub-account that checkout funds should be deposited into
# (passed as order.accountId on checkout and tokenized charges).
# NOMBA_SUB_ACCOUNT_ID=...

# Optional: point at the Nomba sandbox (use sandbox credentials with it).
# NOMBA_BASE_URL=https://sandbox.nomba.com

# Signature key configured on the Nomba dashboard (Developer -> Webhook Setup).
# Inbound Nomba webhooks are rejected unless the HMAC-SHA256 signature verifies.
NOMBA_WEBHOOK_SIGNATURE_KEY=...

# Protects GET /api/cron/billing (scheduled charges + retries).
CRON_SECRET=replace-with-a-long-random-secret
```

### Database migration

After deploying (or when pulling this version), run the idempotent migration
against your database:

```bash
DATABASE_URL=postgresql://... node scripts/migrate.mjs
```

### Deployment notes

- Use a PostgreSQL-compatible database for `DATABASE_URL`.
- Set `BETTER_AUTH_SECRET` to a strong random string.
- For preview deployments, keep `BETTER_AUTH_URL` aligned with the deployment URL.
- Once deployed, the app will automatically redeploy on each commit pushed to the connected branch.

## Configuration notes

If you are connecting payment providers or webhooks, make sure your environment variables and webhook URLs are configured before testing live flows.
