"use client"

import { createAuthClient } from "better-auth/react"

// Determine the base URL for auth endpoints
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return window.location.origin
  }
  // Server-side fallback (shouldn't be used in client component, but just in case)
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signIn, signUp, signOut, useSession } = authClient
