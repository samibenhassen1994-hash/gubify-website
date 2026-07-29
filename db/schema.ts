import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const preRegistrations = sqliteTable(
  "pre_registrations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    deviceInterest: text("device_interest").notNull(),
    consentVersion: text("consent_version").notNull(),
    consentAt: integer("consent_at").notNull(),
    createdAt: integer("created_at").notNull(),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    landingPath: text("landing_path"),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    check(
      "pre_registrations_device_interest_check",
      sql`${table.deviceInterest} in ('android', 'ios', 'both', 'other')`,
    ),
    check(
      "pre_registrations_status_check",
      sql`${table.status} in ('active', 'inactive')`,
    ),
    index("pre_registrations_status_idx").on(table.status),
    index("pre_registrations_utm_source_idx").on(table.utmSource),
    index("pre_registrations_utm_campaign_idx").on(table.utmCampaign),
  ],
);
