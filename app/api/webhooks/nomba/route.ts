'use server'

import { db } from '@/lib/db'
import { transaction, activity } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * Nomba Webhook Handler
 * Receives payment events from Nomba and updates transaction status
 */

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    const payload = JSON.parse(rawBody)

    console.log('[v0] Nomba webhook received:', payload.event)

    // Verify the webhook signature (Nomba should send X-Nomba-Signature header)
    // For now, we'll accept all events. In production, verify the signature.
    // const signature = request.headers.get('x-nomba-signature')
    // if (!verifyNombaSignature(rawBody, signature)) {
    //   return Response.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const { event, data } = payload

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 })
    }

    // Handle different Nomba events
    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(data)
        break

      case 'charge.failed':
        await handleChargeFailed(data)
        break

      case 'charge.retried':
        await handleChargeRetried(data)
        break

      case 'subscription.created':
        await handleSubscriptionCreated(data)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(data)
        break

      default:
        console.log('[v0] Unknown Nomba event:', event)
    }

    // Return 200 to acknowledge receipt
    return Response.json({ ok: true, event })
  } catch (error) {
    console.error('[v0] Nomba webhook error:', error)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleChargeSuccess(data: Record<string, any>) {
  const { reference, amount, customer_id } = data

  // Update transaction status to successful
  await db
    .update(transaction)
    .set({
      status: 'successful',
      nombaRef: reference,
      failureReason: null,
      retryCount: 0,
    })
    .where(eq(transaction.nombaRef, reference))

  console.log('[v0] Charge success recorded:', reference)
}

async function handleChargeFailed(data: Record<string, any>) {
  const { reference, reason, retry_count, next_retry_date } = data

  // Update transaction with failure details
  await db
    .update(transaction)
    .set({
      status: 'failed',
      nombaRef: reference,
      failureReason: reason || 'Payment failed',
      retryCount: retry_count || 0,
      nextRetryDate: next_retry_date ? new Date(next_retry_date) : null,
    })
    .where(eq(transaction.nombaRef, reference))

  console.log('[v0] Charge failed recorded:', reference, reason)
}

async function handleChargeRetried(data: Record<string, any>) {
  const { reference, attempt, next_retry_date } = data

  // Update retry count and next retry date
  await db
    .update(transaction)
    .set({
      status: 'pending',
      nombaRef: reference,
      retryCount: attempt || 1,
      nextRetryDate: next_retry_date ? new Date(next_retry_date) : null,
    })
    .where(eq(transaction.nombaRef, reference))

  console.log('[v0] Charge retry recorded:', reference, 'attempt', attempt)
}

async function handleSubscriptionCreated(data: Record<string, any>) {
  const { customer_id, plan_id, subscription_date } = data

  console.log('[v0] Subscription created recorded:', customer_id, plan_id)
  // Additional logic can be added here if needed
}

async function handleSubscriptionCancelled(data: Record<string, any>) {
  const { customer_id, subscription_id, cancellation_date } = data

  console.log('[v0] Subscription cancelled recorded:', customer_id, subscription_id)
  // Additional logic can be added here if needed
}
