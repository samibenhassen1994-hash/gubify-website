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
    consentGiven: integer("consent_given", { mode: "boolean" }).notNull().default(false),
    consentAt: integer("consent_at").notNull(),
    privacyPolicyVersion: text("privacy_policy_version"),
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

export const feedbackReports = sqliteTable(
  "feedback_reports",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    usefulness: text("usefulness"),
    stepsToReproduce: text("steps_to_reproduce"),
    expectedBehavior: text("expected_behavior"),
    beneficiary: text("beneficiary"),
    contactEmail: text("contact_email"),
    appVersion: text("app_version"),
    appPlatform: text("app_platform"),
    operatingSystem: text("operating_system"),
    deviceModel: text("device_model"),
    browser: text("browser"),
    browserVersion: text("browser_version"),
    language: text("language"),
    timezone: text("timezone"),
    viewportWidth: integer("viewport_width"),
    viewportHeight: integer("viewport_height"),
    pageUrl: text("page_url"),
    sourcePage: text("source_page"),
    origin: text("origin").notNull().default("web"),
    siteBuildIdentifier: text("site_build_identifier"),
    status: text("status").notNull().default("new"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check("feedback_reports_type_check", sql`${table.type} in ('bug', 'feature')`),
    check("feedback_reports_origin_check", sql`${table.origin} in ('web', 'app')`),
    check("feedback_reports_status_check", sql`${table.status} in ('new', 'reviewing', 'planned', 'resolved', 'closed')`),
    index("feedback_reports_type_idx").on(table.type),
    index("feedback_reports_status_idx").on(table.status),
    index("feedback_reports_created_at_idx").on(table.createdAt),
  ],
);

export const accountDeletionRequests = sqliteTable(
  "account_deletion_requests",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    notes: text("notes"),
    confirmation: integer("confirmation", { mode: "boolean" }).notNull(),
    status: text("status").notNull().default("new"),
    notificationStatus: text("notification_status").notNull().default("pending"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "account_deletion_requests_status_check",
      sql`${table.status} in ('new', 'verifying', 'approved', 'completed', 'rejected', 'closed')`,
    ),
    check(
      "account_deletion_requests_notification_status_check",
      sql`${table.notificationStatus} in ('pending', 'sent', 'failed', 'not_configured')`,
    ),
    index("account_deletion_requests_email_idx").on(table.email),
    index("account_deletion_requests_status_idx").on(table.status),
    index("account_deletion_requests_created_at_idx").on(table.createdAt),
  ],
);
