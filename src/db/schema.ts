import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  displayName: text("display_name"),
  stackPublic: boolean("stack_public").notNull().default(true),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationNo: text("registration_no"),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    servingText: text("serving_text"),
    source: text("source", { enum: ["public", "user"] }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (product) => [
    uniqueIndex("products_registration_no_uidx")
      .on(product.registrationNo)
      .where(sql`${product.registrationNo} is not null`),
  ],
);

export const productNutrients = pgTable(
  "product_nutrients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    nutrientKey: text("nutrient_key").notNull(),
    displayName: text("display_name").notNull(),
    amount: doublePrecision("amount").notNull(),
    unit: text("unit").notNull(),
    origin: text("origin", { enum: ["public", "user"] }).notNull(),
    locked: boolean("locked").notNull().default(false),
  },
  (nutrient) => [
    unique("product_nutrients_key_unit").on(nutrient.productId, nutrient.nutrientKey, nutrient.unit),
  ],
);

export const stackItems = pgTable(
  "stack_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    servings: doublePrecision("servings").notNull().default(1),
    timeSlot: text("time_slot", { enum: ["morning", "noon", "evening", "bedtime"] }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (item) => [unique("stack_items_user_product").on(item.userId, item.productId)],
);

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  stackUserId: uuid("stack_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
