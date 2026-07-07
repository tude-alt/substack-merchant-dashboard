import { verifyWebhook } from "./webhook.js"
import type {
  ApiErrorResponse,
  ApiListResponse,
  ApiSingleResponse,
  InlinePlanInput,
  Plan,
  SubflowClientOptions,
  SubscribeInput,
  Subscriber,
} from "./types.js"
import { SubflowApiError } from "./types.js"

const DEFAULT_BASE_URL = "https://subflow.africa"

export class Subflow {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, options: SubflowClientOptions = {}) {
    if (!apiKey?.trim()) {
      throw new Error("Subflow API key is required.")
    }
    this.apiKey = apiKey.trim()
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  }

  /** Create a subscriber (and auto-create a plan when `plan` is provided instead of `planId`). */
  async subscribe(input: SubscribeInput): Promise<Subscriber> {
    let planId: number | undefined

    if ("planId" in input && input.planId != null) {
      planId = input.planId
    } else if ("plan" in input && input.plan) {
      const created = await this.createPlan(input.plan)
      planId = created.id
    } else {
      throw new Error("subscribe() requires either planId or plan.")
    }

    const body = {
      name: input.name,
      email: input.email,
      phone: input.phone ?? "",
      plan_id: planId,
      payment_method: "nomba_checkout_link" as const,
    }

    const res = await this.request<ApiSingleResponse<Subscriber>>("POST", "/api/v1/subscribers", body)
    return res.data
  }

  /** List billing plans for your merchant account. */
  async getPlans(): Promise<Plan[]> {
    const res = await this.request<ApiListResponse<Plan>>("GET", "/api/v1/plans")
    return res.data
  }

  /** Fetch a single subscriber by ID. */
  async getSubscriber(id: number): Promise<Subscriber> {
    const res = await this.request<ApiSingleResponse<Subscriber>>(
      "GET",
      `/api/v1/subscribers/${id}`,
    )
    return res.data
  }

  /**
   * Verify an inbound webhook from Subflow.
   * Pass your webhook secret (whsec_...) as the third argument.
   */
  verifyWebhook(rawBody: string, signatureHeader: string | null | undefined, secret: string): boolean {
    return verifyWebhook(rawBody, signatureHeader, secret)
  }

  private async createPlan(plan: InlinePlanInput): Promise<Plan> {
    const body = {
      name: plan.name,
      amount: plan.amount,
      interval: plan.interval,
      currency: plan.currency ?? "NGN",
      description: plan.description ?? "",
      trial_days: plan.trial_days ?? 0,
      retry_attempts: plan.retry_attempts ?? 3,
      retry_every_days: plan.retry_every_days ?? 3,
      success_redirect_url: plan.success_redirect_url ?? "",
    }

    const res = await this.request<ApiSingleResponse<Plan>>("POST", "/api/v1/plans", body)
    return res.data
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    }

    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
      init.body = JSON.stringify(body)
    }

    const response = await fetch(url, init)
    const text = await response.text()

    let json: unknown
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      throw new SubflowApiError(
        "invalid_response",
        `Subflow returned non-JSON (${response.status})`,
        response.status,
      )
    }

    if (!response.ok) {
      const err = json as ApiErrorResponse
      throw new SubflowApiError(
        err.error ?? "api_error",
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.details ?? {},
      )
    }

    return json as T
  }
}
