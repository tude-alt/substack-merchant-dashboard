#!/usr/bin/env node
// Idempotent schema migration for Subflow. Run with:
//   DATABASE_URL=postgres://... node scripts/migrate.mjs
// Safe to run repeatedly against an existing database.

import { Pool } from "pg"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  // During `next build` on Vercel the variable is present; local builds without
  // a database can still compile the app (--build passes this soft mode).
  if (process.argv.includes("--build")) {
    console.warn("DATABASE_URL is not set — skipping migration for this build.")
    process.exit(0)
  }
  console.error("DATABASE_URL is not set. Refusing to guess a connection string.")
  process.exit(1)
}

const DDL = `
-- Better Auth tables ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "password" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- App tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "merchant" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "businessName" text NOT NULL DEFAULT '',
  "category" text NOT NULL DEFAULT '',
  "nombaApiKey" text,
  "nombaConnected" boolean NOT NULL DEFAULT false,
  "onboardingComplete" boolean NOT NULL DEFAULT false,
  "liveApiKey" text NOT NULL DEFAULT '',
  "testApiKey" text NOT NULL DEFAULT '',
  "webhookUrl" text NOT NULL DEFAULT '',
  "webhookEvents" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "plan" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "amount" bigint NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'NGN',
  "interval" text NOT NULL DEFAULT 'monthly',
  "trialDays" integer NOT NULL DEFAULT 0,
  "retryAttempts" integer NOT NULL DEFAULT 3,
  "retryIntervalDays" integer NOT NULL DEFAULT 3,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscriber" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL DEFAULT '',
  "planId" integer,
  "planName" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending_payment',
  "billingDate" timestamp NOT NULL DEFAULT now(),
  "lastChargeResult" text NOT NULL DEFAULT 'none',
  "mrr" bigint NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "transaction" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "subscriberId" integer,
  "customerName" text NOT NULL DEFAULT '',
  "planName" text NOT NULL DEFAULT '',
  "amount" bigint NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "nombaRef" text NOT NULL DEFAULT '',
  "failureReason" text,
  "retryCount" integer NOT NULL DEFAULT 0,
  "nextRetryDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "activity" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "message" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webhook_delivery" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "endpoint" text NOT NULL DEFAULT '',
  "event" text NOT NULL,
  "statusCode" integer NOT NULL DEFAULT 0,
  "responseTimeMs" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- New columns for the real Nomba integration ----------------------------------
ALTER TABLE "subscriber" ADD COLUMN IF NOT EXISTS "nombaTokenKey" text;
ALTER TABLE "subscriber" ADD COLUMN IF NOT EXISTS "initOrderReference" text;
ALTER TABLE "subscriber" ADD COLUMN IF NOT EXISTS "checkoutLink" text;
ALTER TABLE "webhook_delivery" ADD COLUMN IF NOT EXISTS "attempt" integer NOT NULL DEFAULT 1;
ALTER TABLE "webhook_delivery" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "webhookSecret" text NOT NULL DEFAULT '';
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "successRedirectUrl" text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "plan_metric_snapshot" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "planId" integer NOT NULL,
  "snapshotDate" date NOT NULL,
  "mrr" bigint NOT NULL DEFAULT 0,
  "activeSubscribers" integer NOT NULL DEFAULT 0,
  "monitoringEnabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE("userId", "planId", "snapshotDate")
);

ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "successRedirectUrl" text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "plan_metric_snapshot" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "planId" integer NOT NULL,
  "snapshotDate" date NOT NULL,
  "mrr" bigint NOT NULL DEFAULT 0,
  "activeSubscribers" integer NOT NULL DEFAULT 0,
  "monitoringEnabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE("userId", "planId", "snapshotDate")
);

CREATE TABLE IF NOT EXISTS "api_idempotency" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "statusCode" integer NOT NULL,
  "responseBody" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE("userId", "idempotencyKey")
);

-- Remove fabricated-success defaults: statuses must come from real outcomes ----
ALTER TABLE "subscriber" ALTER COLUMN "status" SET DEFAULT 'pending_payment';
ALTER TABLE "subscriber" ALTER COLUMN "lastChargeResult" SET DEFAULT 'none';
ALTER TABLE "transaction" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "webhook_delivery" ALTER COLUMN "statusCode" SET DEFAULT 0;

-- Product recommendations: branding, alerts, portal, coupons ---------------
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "alertEmail" text NOT NULL DEFAULT '';
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "slackWebhookUrl" text NOT NULL DEFAULT '';
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "logoUrl" text NOT NULL DEFAULT '';
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "brandColor" text NOT NULL DEFAULT '#4f46e5';
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "nombaWebhookAcknowledged" boolean NOT NULL DEFAULT false;
ALTER TABLE "subscriber" ADD COLUMN IF NOT EXISTS "portalToken" text;

CREATE TABLE IF NOT EXISTS "coupon" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL,
  "code" text NOT NULL,
  "planId" integer,
  "percentOff" integer NOT NULL DEFAULT 0,
  "amountOff" bigint NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
`

const pool = new Pool({ connectionString: DATABASE_URL })
try {
  await pool.query(DDL)
  console.log("Migration applied successfully.")
} finally {
  await pool.end()
}
