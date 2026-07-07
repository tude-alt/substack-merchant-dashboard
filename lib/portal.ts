import crypto from "crypto"

export function generatePortalToken(): string {
  return crypto.randomBytes(24).toString("hex")
}
