import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  bigint,
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
  status: text("status").notNull().default("active"),
  billingDate: timestamp("billingDate").notNull().defaultNow(),
  lastChargeResult: text("lastChargeResult").notNull().default("successful"),
  mrr: bigint("mrr", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  subscriberId: integer("subscriberId"),
  customerName: text("customerName").notNull().default(""),
  planName: text("planName").notNull().default(""),
  amount: bigint("amount", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("successful"),
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

export const webhookDelivery = pgTable("webhook_delivery", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  endpoint: text("endpoint").notNull().default(""),
  event: text("event").notNull(),
  statusCode: integer("statusCode").notNull().default(200),
  responseTimeMs: integer("responseTimeMs").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
