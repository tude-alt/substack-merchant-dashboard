import type { Plan, SubflowClientOptions, SubscribeInput, Subscriber } from "./types.js";
export declare class Subflow {
    private readonly apiKey;
    private readonly baseUrl;
    constructor(apiKey: string, options?: SubflowClientOptions);
    /** Create a subscriber (and auto-create a plan when `plan` is provided instead of `planId`). */
    subscribe(input: SubscribeInput): Promise<Subscriber>;
    /** List billing plans for your merchant account. */
    getPlans(): Promise<Plan[]>;
    /** Fetch a single subscriber by ID. */
    getSubscriber(id: number): Promise<Subscriber>;
    /**
     * Verify an inbound webhook from Subflow.
     * Pass your webhook secret (whsec_...) as the third argument.
     */
    verifyWebhook(rawBody: string, signatureHeader: string | null | undefined, secret: string): boolean;
    private createPlan;
    private request;
}
//# sourceMappingURL=client.d.ts.map