export type BillingInterval = "monthly" | "quarterly" | "annual";
export type Plan = {
    id: number;
    name: string;
    amount: number;
    currency: string;
    interval: BillingInterval;
    retry_attempts: number;
    retry_every_days: number;
    success_redirect_url: string | null;
    status: "active";
};
export type InlinePlanInput = {
    name: string;
    amount: number;
    interval: BillingInterval;
    currency?: string;
    description?: string;
    trial_days?: number;
    retry_attempts?: number;
    retry_every_days?: number;
    success_redirect_url?: string;
};
export type SubscriberStatus = "pending_payment" | "active" | string;
export type Subscriber = {
    id: number;
    name: string;
    email: string;
    phone: string;
    plan_id: number | null;
    plan_name: string;
    status: SubscriberStatus;
    payment_method: "checkout_link";
    checkout_url: string | null;
    checkout_link: string | null;
    order_reference: string | null;
    subscription_becomes_active_on: "nomba_payment_success_webhook";
    subscription_active: boolean;
    message: string;
};
export type SubscribeInput = {
    planId: number;
    email: string;
    name: string;
    phone?: string;
} | {
    plan: InlinePlanInput;
    email: string;
    name: string;
    phone?: string;
};
export type SubflowClientOptions = {
    /** API base URL. Defaults to https://subflow.africa */
    baseUrl?: string;
};
export type ApiListResponse<T> = {
    data: T[];
};
export type ApiSingleResponse<T> = {
    data: T;
};
export type ApiErrorResponse = {
    error: string;
    message: string;
    details?: Record<string, unknown>;
};
export declare class SubflowApiError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details: Record<string, unknown>;
    constructor(code: string, message: string, status: number, details?: Record<string, unknown>);
}
//# sourceMappingURL=types.d.ts.map