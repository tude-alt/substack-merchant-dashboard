/**
 * Verify an inbound Subflow webhook signature.
 *
 * @param rawBody - Raw request body string (before JSON parsing)
 * @param signatureHeader - Value of the X-Subflow-Signature header
 * @param secret - Your webhook secret (whsec_...) from Subflow Settings
 */
export declare function verifyWebhook(rawBody: string, signatureHeader: string | null | undefined, secret: string): boolean;
//# sourceMappingURL=webhook.d.ts.map