import "server-only"

import crypto from "crypto"

/**
 * Real Nomba API client.
 *
 * Endpoints, auth method, and payload shapes verified against
 * https://developer.nomba.com (Vendor API, OpenAPI 3.0.1):
 *
 *   POST /v1/auth/token/issue              — OAuth2 client_credentials. Headers:
 *                                            `accountId`. Body: { grant_type,
 *                                            client_id, client_secret }.
 *                                            200 → { code:"00", data:{ access_token,
 *                                            refresh_token, expiresAt } }
 *   POST /v1/checkout/order                — create hosted checkout order. With
 *                                            tokenizeCard:true Nomba tokenizes the
 *                                            card and sends tokenKey in the
 *                                            payment_success webhook.
 *                                            200 → { code:"00", data:{ checkoutLink,
 *                                            orderReference } }
 *   POST /v1/checkout/tokenized-card-payment — merchant-initiated recurring charge
 *                                            using a stored tokenKey.
 *   GET  /v1/transactions/accounts/single  — verify a transaction by orderReference.
 *                                            data.status === "SUCCESS" means paid.
 *
 * Failure responses are JSON of shape { code, description } with non-"00" code
 * (HTTP 400/401/403/404/429/500). We surface those verbatim — no fabrication.
 */

const REQUIRED_ENV = [
  "NOMBA_CLIENT_ID",
  "NOMBA_PRIVATE_KEY", // Nomba's client_secret
  "NOMBA_ACCOUNT_ID",
] as const

export class NombaConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Nomba is not configured: missing environment variable(s) ${missing.join(", ")}. ` +
        `Set them in your deployment environment (e.g. Vercel project settings). ` +
        `There is NO mock fallback — real charges cannot proceed without real credentials.`,
    )
    this.name = "NombaConfigError"
  }
}

export class NombaApiError extends Error {
  readonly httpStatus: number
  readonly code: string
  readonly description: string
  readonly raw: unknown

  constructor(opts: {
    httpStatus: number
    code: string
    description: string
    raw: unknown
    context: string
  }) {
    super(
      `Nomba ${opts.context} failed (HTTP ${opts.httpStatus}, code ${opts.code}): ${opts.description}`,
    )
    this.name = "NombaApiError"
    this.httpStatus = opts.httpStatus
    this.code = opts.code
    this.description = opts.description
    this.raw = opts.raw
  }
}

export function getNombaConfig() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]?.trim())
  if (missing.length > 0) throw new NombaConfigError(missing)
  return {
    clientId: process.env.NOMBA_CLIENT_ID!.trim(),
    clientSecret: process.env.NOMBA_PRIVATE_KEY!.trim(),
    accountId: process.env.NOMBA_ACCOUNT_ID!.trim(),
    // Optional outlet/sub-account to scope orders to. Nomba: authenticate with
    // the parent accountId header, deposit funds to the sub-account by passing
    // it as order.accountId.
    subAccountId: process.env.NOMBA_SUB_ACCOUNT_ID?.trim() || null,
    // Production by default. Set NOMBA_BASE_URL=https://sandbox.nomba.com to use
    // sandbox credentials (credentials are environment-specific).
    baseUrl: (process.env.NOMBA_BASE_URL?.trim() || "https://api.nomba.com").replace(/\/$/, ""),
  }
}

type NombaEnvelope<T> = {
  code?: string
  description?: string
  message?: string
  data?: T
  status?: boolean
}

async function parseNombaResponse<T>(
  res: Response,
  context: string,
): Promise<T> {
  const text = await res.text()
  let body: NombaEnvelope<T> | null = null
  try {
    body = JSON.parse(text) as NombaEnvelope<T>
  } catch {
    // Non-JSON body: still a real response, surface it.
  }

  if (!res.ok || !body || body.code !== "00") {
    throw new NombaApiError({
      httpStatus: res.status,
      code: body?.code ?? String(res.status),
      description:
        body?.description ?? body?.message ?? (text ? text.slice(0, 500) : "Empty response body"),
      raw: body ?? text,
      context,
    })
  }
  return body.data as T
}

// ---------------------------------------------------------------------------
// Access token (30 min lifetime; refreshed 5 min before expiry per Nomba docs)
// ---------------------------------------------------------------------------
type TokenCache = { accessToken: string; expiresAtMs: number }
let tokenCache: TokenCache | null = null

function nombaNetworkError(context: string, cause: unknown): NombaApiError {
  return new NombaApiError({
    httpStatus: 0,
    code: "network_error",
    description: cause instanceof Error ? cause.message : String(cause),
    raw: null,
    context,
  })
}

export async function getNombaAccessToken(): Promise<string> {
  const cfg = getNombaConfig()

  const now = Date.now()
  if (tokenCache && tokenCache.expiresAtMs - 5 * 60 * 1000 > now) {
    return tokenCache.accessToken
  }

  let res: Response
  try {
    res = await fetch(`${cfg.baseUrl}/v1/auth/token/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accountId: cfg.accountId,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
      cache: "no-store",
    })
  } catch (e) {
    throw nombaNetworkError("token issue (POST /v1/auth/token/issue)", e)
  }

  const data = await parseNombaResponse<{
    access_token: string
    refresh_token: string
    expiresAt: string
    businessId: string
  }>(res, "token issue (POST /v1/auth/token/issue)")

  const expiresAtMs = Date.parse(data.expiresAt)
  tokenCache = {
    accessToken: data.access_token,
    expiresAtMs: Number.isNaN(expiresAtMs) ? now + 25 * 60 * 1000 : expiresAtMs,
  }
  return data.access_token
}

async function nombaFetch(path: string, init: RequestInit): Promise<Response> {
  const cfg = getNombaConfig()
  const token = await getNombaAccessToken()
  try {
    return await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accountId: cfg.accountId,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    })
  } catch (e) {
    throw nombaNetworkError(`fetch ${path}`, e)
  }
}

/** Amounts are stored internally in kobo; Nomba expects a naira amount ("10000.00"). */
export function koboToNombaAmount(kobo: number): string {
  return (Math.round(kobo) / 100).toFixed(2)
}

export function koboToNombaAmountNumber(kobo: number): number {
  return Number(koboToNombaAmount(kobo))
}

// ---------------------------------------------------------------------------
// Credential verification (used by onboarding "Connect Nomba")
// ---------------------------------------------------------------------------
export async function verifyNombaCredentials(): Promise<
  { ok: true; businessId: string } | { ok: false; error: string }
> {
  const cfg = getNombaConfig() // throws NombaConfigError loudly if unset
  const res = await fetch(`${cfg.baseUrl}/v1/auth/token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: cfg.accountId },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
    cache: "no-store",
  })
  try {
    const data = await parseNombaResponse<{ businessId: string; access_token: string }>(
      res,
      "credential verification (POST /v1/auth/token/issue)",
    )
    return { ok: true, businessId: data.businessId }
  } catch (e) {
    if (e instanceof NombaApiError) return { ok: false, error: e.message }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Checkout order (initial payment + card tokenization)
// ---------------------------------------------------------------------------
export async function createCheckoutOrder(input: {
  amountKobo: number
  currency: string
  customerEmail: string
  customerId: string
  orderReference: string
  callbackUrl: string
}): Promise<{ checkoutLink: string; orderReference: string }> {
  const cfg = getNombaConfig()
  const res = await nombaFetch("/v1/checkout/order", {
    method: "POST",
    body: JSON.stringify({
      order: {
        orderReference: input.orderReference,
        customerId: input.customerId,
        customerEmail: input.customerEmail,
        amount: koboToNombaAmountNumber(input.amountKobo),
        currency: input.currency,
        callbackUrl: input.callbackUrl,
        ...(cfg.subAccountId ? { accountId: cfg.subAccountId } : {}),
      },
      // Required for recurring billing: Nomba returns tokenKey in the
      // payment_success webhook only when the card is tokenized.
      tokenizeCard: true,
    }),
  })
  const data = await parseNombaResponse<{ checkoutLink?: string; orderReference?: string }>(
    res,
    "checkout order (POST /v1/checkout/order)",
  )
  if (!data.checkoutLink?.trim()) {
    throw new NombaApiError({
      httpStatus: res.status,
      code: "invalid_response",
      description:
        "Nomba accepted the checkout order but did not return checkoutLink. " +
        "Check Nomba dashboard logs and verify checkout is enabled for this account.",
      raw: data,
      context: "checkout order (POST /v1/checkout/order)",
    })
  }
  return {
    checkoutLink: data.checkoutLink,
    orderReference: data.orderReference ?? input.orderReference,
  }
}

// ---------------------------------------------------------------------------
// Tokenized card charge (recurring / retry)
// ---------------------------------------------------------------------------
export type NombaChargeResult =
  | { ok: true; orderReference: string; raw: unknown }
  | {
      ok: false
      orderReference: string
      httpStatus: number
      code: string
      description: string
      raw: unknown
    }

export async function chargeTokenizedCard(input: {
  tokenKey: string
  amountKobo: number
  currency: string
  customerEmail: string
  customerId: string
  orderReference: string
  callbackUrl: string
}): Promise<NombaChargeResult> {
  // Config problems throw loudly; a declined/failed charge is returned as a
  // structured real failure so callers can persist the true outcome.
  const cfg = getNombaConfig()
  const res = await nombaFetch("/v1/checkout/tokenized-card-payment", {
    method: "POST",
    body: JSON.stringify({
      order: {
        orderReference: input.orderReference,
        customerId: input.customerId,
        customerEmail: input.customerEmail,
        amount: koboToNombaAmountNumber(input.amountKobo),
        currency: input.currency,
        callbackUrl: input.callbackUrl,
        ...(cfg.subAccountId ? { accountId: cfg.subAccountId } : {}),
      },
      tokenKey: input.tokenKey,
    }),
  })

  try {
    const data = await parseNombaResponse<{ status?: boolean; message?: string }>(
      res,
      "tokenized card charge (POST /v1/checkout/tokenized-card-payment)",
    )
    if (data && data.status === false) {
      return {
        ok: false,
        orderReference: input.orderReference,
        httpStatus: res.status,
        code: "00",
        description: data.message ?? "Charge declined",
        raw: data,
      }
    }
    return { ok: true, orderReference: input.orderReference, raw: data }
  } catch (e) {
    if (e instanceof NombaApiError) {
      return {
        ok: false,
        orderReference: input.orderReference,
        httpStatus: e.httpStatus,
        code: e.code,
        description: e.description,
        raw: e.raw,
      }
    }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Transaction verification (docs: always verify before giving value)
// ---------------------------------------------------------------------------
export type NombaVerification =
  | { found: true; status: string; transactionId: string; gatewayMessage?: string; raw: unknown }
  | { found: false; code: string; description: string }

export async function verifyTransaction(query: {
  orderReference?: string
  transactionRef?: string
}): Promise<NombaVerification> {
  const params = new URLSearchParams()
  if (query.orderReference) params.set("orderReference", query.orderReference)
  else if (query.transactionRef) params.set("transactionRef", query.transactionRef)
  else throw new Error("verifyTransaction requires an orderReference or transactionRef")

  const res = await nombaFetch(`/v1/transactions/accounts/single?${params.toString()}`, {
    method: "GET",
  })
  try {
    const data = await parseNombaResponse<{
      id: string
      status: string
      gatewayMessage?: string
    }>(res, "transaction verification (GET /v1/transactions/accounts/single)")
    return {
      found: true,
      status: data.status,
      transactionId: data.id,
      gatewayMessage: data.gatewayMessage,
      raw: data,
    }
  } catch (e) {
    if (e instanceof NombaApiError) {
      // "01 Transaction not found" is a real, expected lookup miss.
      return { found: false, code: e.code, description: e.description }
    }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Inbound webhook signature verification (HmacSHA256, base64 — per Nomba docs).
// Only applicable when a signature key is configured; when it is not, events
// must be verified against Nomba's transaction API before being trusted.
// ---------------------------------------------------------------------------
export function verifyNombaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  key: string,
): { valid: boolean; reason?: string } {
  if (!signatureHeader) {
    return { valid: false, reason: "Missing nomba-signature header" }
  }
  const expected = crypto.createHmac("sha256", key).update(rawBody, "utf8").digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "Signature mismatch" }
  }
  return { valid: true }
}
