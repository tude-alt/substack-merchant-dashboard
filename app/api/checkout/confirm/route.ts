import { confirmInitialPaymentByOrderReference } from "@/lib/confirm-payment"

export async function POST(request: Request) {
  let body: { orderReference?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const orderReference = body.orderReference?.trim()
  if (!orderReference) {
    return Response.json({ error: "orderReference is required" }, { status: 400 })
  }

  const result = await confirmInitialPaymentByOrderReference(orderReference)
  return Response.json({ result })
}
