"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Poll dashboard for new payments and refresh server components. */
export function DashboardLiveRefresh() {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/pulse")
        if (!res.ok) return
        const data = await res.json()
        if (data.latestActivity?.type === "charge.success") {
          router.refresh()
        }
      } catch {
        // ignore
      }
    }, 20000)
    return () => clearInterval(timer)
  }, [router])

  return null
}
