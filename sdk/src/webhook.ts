import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Verify an inbound Subflow webhook signature.
 *
 * @param rawBody - Raw request body string (before JSON parsing)
 * @param signatureHeader - Value of the X-Subflow-Signature header
 * @param secret - Your webhook secret (whsec_...) from Subflow Settings
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")

  try {
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(signatureHeader.trim(), "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
