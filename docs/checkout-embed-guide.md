# Hosted checkout & embed — no API required

Use Subflow **without writing server code**. Share a checkout link, embed a button on your site, or pre-fill customer details with URL parameters.

## 1. Get your checkout link

Every plan has a hosted checkout URL:

```
https://YOUR_DOMAIN/checkout/{plan_id}
```

**Dashboard:** Plans → copy the **Checkout link** for any plan (e.g. `https://substack-merchant-dashboard.vercel.app/checkout/42`).

Optional query parameters to pre-fill the form:

- `email` — e.g. `?email=ada@example.com`
- `name` — e.g. `?name=Ada+Obi`
- `phone` — e.g. `?phone=%2B2348012345678`

Example:

```
https://YOUR_DOMAIN/checkout/42?email=ada@example.com&name=Ada%20Obi
```

## 2. What happens when a customer pays

1. Customer opens your checkout link and enters their details.
2. Subflow creates a subscriber (`pending_payment`) and redirects to **Nomba** for card payment.
3. After payment, Nomba redirects to the plan success page with `?ref=SUBFLOW-INIT-...`.
4. Subflow **verifies the payment with Nomba** on that page and activates the subscription.
5. Your dashboard updates: subscriber becomes **Active**, transaction appears, MRR increases.

If the dashboard still shows **Pending payment** after a successful charge, open the subscriber row and click **Verify payment** — or ensure the Nomba inbound webhook is registered (see below).

## 3. Embed a subscribe button (modal or redirect)

Add one script tag and a placeholder `div` anywhere on your site:

```html
<div data-subflow-checkout="42"></div>
<script
  src="https://YOUR_DOMAIN/embed.js"
  data-subflow-plan="42"
  data-subflow-label="Subscribe now"
  data-subflow-mode="modal"
></script>
```

### Script attributes

- `data-subflow-plan` (required) — Plan ID from the dashboard
- `data-subflow-label` (optional, default `Subscribe`) — Button text
- `data-subflow-mode` (optional, default `modal`) — `modal` (iframe overlay) or `redirect` (same tab)
- `data-subflow-email`, `data-subflow-name`, `data-subflow-phone` (optional) — Pre-fill checkout fields

### Redirect mode (full-page checkout)

```html
<script
  src="https://YOUR_DOMAIN/embed.js"
  data-subflow-plan="42"
  data-subflow-mode="redirect"
  data-subflow-label="Get started"
></script>
```

## 4. Custom success redirect (optional)

When creating or editing a plan, set **Success redirect URL** to send customers back to your app after payment, e.g. `https://yourapp.com/welcome`.

Subflow appends `?ref={order_reference}` to that URL so your app can poll Subflow or wait for webhooks. If you leave it blank, customers land on Subflow's built-in success page (which confirms payment automatically).

## 5. Register Nomba's webhook (recommended)

For the fastest dashboard updates (and as a backup if the customer closes the browser before the success page loads), register this URL in your **Nomba developer dashboard**:

```
https://YOUR_DOMAIN/api/webhooks/nomba
```

Subflow verifies every event with Nomba's API before changing subscription state.

## 6. When you still need the API

Hosted checkout is enough if you only need:

- Customers to subscribe and pay
- Revenue and subscribers in the Subflow dashboard

Use the **REST API** or **@subflow/sdk** when your SaaS must:

- Create subscribers from your backend during signup
- Receive `charge.success` / `charge.failed` webhooks on your own server
- Gate product access programmatically

See **Integration quickstart** (`docs/merchant-quickstart.md`) for the full API flow.

## 7. Troubleshooting

- **Customer paid but dashboard shows Pending payment** — Subscribers → expand row → **Verify payment**. Register the Nomba webhook URL above.
- **No transactions** — Payment not confirmed yet; verify payment or check Nomba dashboard.
- **Embed button missing** — Ensure `data-subflow-plan` matches a live plan ID and `embed.js` loads from your Subflow domain.
- **Checkout link 404** — Plan was deleted or ID is wrong — copy link again from Plans.
