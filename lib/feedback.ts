const types = ["bug", "feature"] as const;
const beneficiaries = ["friends", "couples", "families", "roommates", "teams", "communities", "everyone"] as const;

type FeedbackType = (typeof types)[number];

const clean = (value: unknown, max: number) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\u0000/g, "");
  return normalized && normalized.length <= max ? normalized : null;
};

const optional = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === "") return null;
  return clean(value, max);
};

export function validateFeedback(input: unknown):
  | { ok: true; data: {
      type: FeedbackType; title: string; description: string; usefulness: string | null;
      stepsToReproduce: string | null; expectedBehavior: string | null; beneficiary: string | null;
      contactEmail: string | null; appVersion: string | null; appPlatform: string | null;
      operatingSystem: string | null; deviceModel: string | null; browser: string | null;
      browserVersion: string | null; language: string | null; timezone: string | null;
      viewportWidth: number | null; viewportHeight: number | null; pageUrl: string | null;
      sourcePage: string | null; origin: "web" | "app"; siteBuildIdentifier: string | null;
      turnstileToken: string; website: string | null;
    } }
  | { ok: false; field?: string; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid submission." };
  const value = input as Record<string, unknown>;
  if (!types.includes(value.type as FeedbackType)) return { ok: false, field: "type", error: "Choose a valid feedback type." };
  const type = value.type as FeedbackType;
  const title = clean(value.title, 120);
  const description = clean(value.description, 4000);
  if (!title) return { ok: false, field: "title", error: "Enter a title of up to 120 characters." };
  if (!description) return { ok: false, field: "description", error: "Enter a description of up to 4,000 characters." };
  const usefulness = optional(value.usefulness, 4000);
  if (type === "feature" && !usefulness) return { ok: false, field: "usefulness", error: "Explain why this feature would be useful." };
  const contactEmail = optional(value.contactEmail, 254);
  if (contactEmail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactEmail)) {
    return { ok: false, field: "contactEmail", error: "Enter a valid email address." };
  }
  const beneficiary = optional(value.beneficiary, 30)?.toLowerCase() ?? null;
  if (beneficiary && !beneficiaries.includes(beneficiary as typeof beneficiaries[number])) {
    return { ok: false, field: "beneficiary", error: "Choose a valid beneficiary." };
  }
  const integer = (candidate: unknown) => Number.isInteger(candidate) && Number(candidate) > 0 && Number(candidate) <= 10000 ? Number(candidate) : null;
  const origin = value.origin === "app" ? "app" : "web";
  const appPlatform = value.appPlatform === "android" || value.appPlatform === "ios" ? value.appPlatform : null;
  const turnstileToken = clean(value.turnstileToken, 2048);
  if (!turnstileToken) return { ok: false, field: "turnstile", error: "Complete the security check." };
  return { ok: true, data: {
    type, title, description, usefulness,
    stepsToReproduce: optional(value.stepsToReproduce, 4000),
    expectedBehavior: optional(value.expectedBehavior, 4000), beneficiary,
    contactEmail: contactEmail?.toLowerCase() ?? null,
    appVersion: optional(value.appVersion, 80), appPlatform,
    operatingSystem: optional(value.operatingSystem, 80), deviceModel: optional(value.deviceModel, 120),
    browser: optional(value.browser, 60), browserVersion: optional(value.browserVersion, 40),
    language: optional(value.language, 35), timezone: optional(value.timezone, 80),
    viewportWidth: integer(value.viewportWidth), viewportHeight: integer(value.viewportHeight),
    pageUrl: optional(value.pageUrl, 500), sourcePage: optional(value.sourcePage, 500), origin,
    siteBuildIdentifier: optional(value.siteBuildIdentifier, 100), turnstileToken,
    website: optional(value.website, 200),
  }};
}

export async function saveFeedback(database: D1Database, data: Exclude<ReturnType<typeof validateFeedback>, { ok: false }>["data"], now: number, id: string) {
  await database.prepare(`INSERT INTO feedback_reports (
    id, type, title, description, usefulness, steps_to_reproduce, expected_behavior,
    beneficiary, contact_email, app_version, app_platform, operating_system, device_model,
    browser, browser_version, language, timezone, viewport_width, viewport_height,
    page_url, source_page, origin, site_build_identifier, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`)
    .bind(id, data.type, data.title, data.description, data.usefulness, data.stepsToReproduce,
      data.expectedBehavior, data.beneficiary, data.contactEmail, data.appVersion, data.appPlatform,
      data.operatingSystem, data.deviceModel, data.browser, data.browserVersion, data.language,
      data.timezone, data.viewportWidth, data.viewportHeight, data.pageUrl, data.sourcePage,
      data.origin, data.siteBuildIdentifier, now, now).run();
}
