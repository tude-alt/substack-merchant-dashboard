import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  bigint,
  unique,
  date,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables (do not rename columns — they match Better Auth defaults)
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// App tables (scoped per user via userId — no foreign keys by design)
// ---------------------------------------------------------------------------
export const merchant = pgTable("merchant", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  businessName: text("businessName").notNull().default(""),
  category: text("category").notNull().default(""),
  nombaApiKey: text("nombaApiKey"),
  nombaConnected: boolean("nombaConnected").notNull().default(false),
  onboardingComplete: boolean("onboardingComplete").notNull().default(false),
  liveApiKey: text("liveApiKey").notNull().default(""),
  testApiKey: text("testApiKey").notNull().default(""),
  webhookUrl: text("webhookUrl").notNull().default(""),
  webhookEvents: text("webhookEvents").notNull().default(""),
  webhookSecret: text("webhookSecret").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const plan = pgTable("plan", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  amount: bigint("amount", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("NGN"),
  interval: text("interval").notNull().default("monthly"),
  trialDays: integer("trialDays").notNull().default(0),
  retryAttempts: integer("retryAttempts").notNull().default(3),
  retryIntervalDays: integer("retryIntervalDays").notNull().default(3),
  successRedirectUrl: text("successRedirectUrl").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const subscriber = pgTable("subscriber", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  planId: integer("planId"),
  planName: text("planName").notNull().default(""),
  // "pending_payment" until the customer completes the initial Nomba checkout;
  // never born "active" with a fabricated successful charge.
  status: text("status").notNull().default("pending_payment"),
  billingDate: timestamp("billingDate").notNull().defaultNow(),
  lastChargeResult: text("lastChargeResult").notNull().default("none"),
  mrr: bigint("mrr", { mode: "number" }).notNull().default(0),
  // Card token issued by Nomba in the payment_success webhook (tokenizedCardData.tokenKey).
  nombaTokenKey: text("nombaTokenKey"),
  // orderReference of the initial tokenizing checkout order, used to correlate the webhook.
  initOrderReference: text("initOrderReference"),
  checkoutLink: text("checkoutLink"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  subscriberId: integer("subscriberId"),
  customerName: text("customerName").notNull().default(""),
  planName: text("planName").notNull().default(""),
  amount: bigint("amount", { mode: "number" }).notNull().default(0),
  // Status must always be written explicitly from a real charge outcome.
  status: text("status").notNull().default("pending"),
  nombaRef: text("nombaRef").notNull().default(""),
  failureReason: text("failureReason"),
  retryCount: integer("retryCount").notNull().default(0),
  nextRetryDate: timestamp("nextRetryDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const apiIdempotency = pgTable(
  "api_idempotency",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    idempotencyKey: text("idempotencyKey").notNull(),
    statusCode: integer("statusCode").notNull(),
    responseBody: text("responseBody").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.idempotencyKey)],
)

export const webhookDelivery = pgTable("webhook_delivery", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  endpoint: text("endpoint").notNull().default(""),
  event: text("event").notNull(),
  // Real HTTP status returned by the merchant's endpoint. 0 means the request
  // never got an HTTP response (DNS failure, connection refused, timeout).
  statusCode: integer("statusCode").notNull().default(0),
  responseTimeMs: integer("responseTimeMs").notNull().default(0),
  attempt: integer("attempt").notNull().default(1),
  error: text("error"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Daily per-plan MRR snapshots for monitoring trends. */
export const planMetricSnapshot = pgTable(
  "plan_metric_snapshot",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    planId: integer("planId").notNull(),
    snapshotDate: date("snapshotDate").notNull(),
    mrr: bigint("mrr", { mode: "number" }).notNull().default(0),
    activeSubscribers: integer("activeSubscribers").notNull().default(0),
    monitoringEnabled: boolean("monitoringEnabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.planId, t.snapshotDate)],
)
