import { verifyWebhook } from "./webhook.js";
import { SubflowApiError } from "./types.js";
const DEFAULT_BASE_URL = "https://subflow.africa";
export class Subflow {
    apiKey;
    baseUrl;
    constructor(apiKey, options = {}) {
        if (!apiKey?.trim()) {
            throw new Error("Subflow API key is required.");
        }
        this.apiKey = apiKey.trim();
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    }
    /** Create a subscriber (and auto-create a plan when `plan` is provided instead of `planId`). */
    async subscribe(input) {
        let planId;
        if ("planId" in input && input.planId != null) {
            planId = input.planId;
        }
        else if ("plan" in input && input.plan) {
            const created = await this.createPlan(input.plan);
            planId = created.id;
        }
        else {
            throw new Error("subscribe() requires either planId or plan.");
        }
        const body = {
            name: input.name,
            email: input.email,
            phone: input.phone ?? "",
            plan_id: planId,
            payment_method: "nomba_checkout_link",
        };
        const res = await this.request("POST", "/api/v1/subscribers", body);
        return res.data;
    }
    /** List billing plans for your merchant account. */
    async getPlans() {
        const res = await this.request("GET", "/api/v1/plans");
        return res.data;
    }
    /** Fetch a single subscriber by ID. */
    async getSubscriber(id) {
        const res = await this.request("GET", `/api/v1/subscribers/${id}`);
        return res.data;
    }
    /**
     * Verify an inbound webhook from Subflow.
     * Pass your webhook secret (whsec_...) as the third argument.
     */
    verifyWebhook(rawBody, signatureHeader, secret) {
        return verifyWebhook(rawBody, signatureHeader, secret);
    }
    async createPlan(plan) {
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
        };
        const res = await this.request("POST", "/api/v1/plans", body);
        return res.data;
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
        };
        const init = { method, headers };
        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(body);
        }
        const response = await fetch(url, init);
        const text = await response.text();
        let json;
        try {
            json = text ? JSON.parse(text) : {};
        }
        catch {
            throw new SubflowApiError("invalid_response", `Subflow returned non-JSON (${response.status})`, response.status);
        }
        if (!response.ok) {
            const err = json;
            throw new SubflowApiError(err.error ?? "api_error", err.message ?? `Request failed with status ${response.status}`, response.status, err.details ?? {});
        }
        return json;
    }
}
