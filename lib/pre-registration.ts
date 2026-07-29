export const BETA_GOAL = 10_000;
export const CONSENT_VERSION = "pre-register-v1";
export const DEVICE_INTERESTS = ["android", "ios", "both", "other"] as const;

export type DeviceInterest = (typeof DEVICE_INTERESTS)[number];

export type RegistrationInput = {
  firstName: string | null;
  email: string;
  deviceInterest: DeviceInterest;
  consent: true;
  turnstileToken: string;
  honeypot: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
};

type ValidationResult =
  | { ok: true; data: RegistrationInput }
  | { ok: false; field: string; error: string };

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const HTML_PATTERN = /<[^>]*>/;

function cleanOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > maxLength || HTML_PATTERN.test(cleaned)) return null;
  return cleaned;
}

export function validateRegistrationPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, field: "form", error: "Invalid request." };
  }

  const input = payload as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || HTML_PATTERN.test(email)) {
    return { ok: false, field: "email", error: "Enter a valid email address." };
  }

  const rawFirstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  if (rawFirstName.length > 80 || HTML_PATTERN.test(rawFirstName)) {
    return { ok: false, field: "firstName", error: "Enter a valid first name." };
  }

  if (!DEVICE_INTERESTS.includes(input.deviceInterest as DeviceInterest)) {
    return { ok: false, field: "deviceInterest", error: "Choose a device." };
  }

  if (input.consent !== true) {
    return { ok: false, field: "consent", error: "Consent is required." };
  }

  const turnstileToken =
    typeof input.turnstileToken === "string" ? input.turnstileToken.trim() : "";
  if (!turnstileToken || turnstileToken.length > 2048) {
    return { ok: false, field: "turnstile", error: "Complete the security check." };
  }

  const honeypot = typeof input.website === "string" ? input.website.trim() : "";
  if (honeypot.length > 0) {
    return { ok: false, field: "form", error: "Invalid request." };
  }

  return {
    ok: true,
    data: {
      firstName: rawFirstName || null,
      email,
      deviceInterest: input.deviceInterest as DeviceInterest,
      consent: true,
      turnstileToken,
      honeypot,
      utmSource: cleanOptional(input.utmSource, 120),
      utmMedium: cleanOptional(input.utmMedium, 120),
      utmCampaign: cleanOptional(input.utmCampaign, 160),
      utmContent: cleanOptional(input.utmContent, 160),
      utmTerm: cleanOptional(input.utmTerm, 160),
      landingPath: cleanOptional(input.landingPath, 300),
    },
  };
}

export function calculateBetaProgress(rawCount: unknown) {
  const count =
    typeof rawCount === "number" && Number.isFinite(rawCount)
      ? Math.max(0, Math.floor(rawCount))
      : 0;
  const remaining = Math.max(0, BETA_GOAL - count);
  const percentage = Math.min(100, Number(((count / BETA_GOAL) * 100).toFixed(2)));

  return {
    count,
    goal: BETA_GOAL,
    remaining,
    percentage,
    goalReached: count >= BETA_GOAL,
  };
}

export async function savePreRegistration(
  database: D1Database,
  data: RegistrationInput,
  now: number,
  id: string,
) {
  const result = await database.prepare(
    `INSERT INTO pre_registrations (
      id, email, first_name, device_interest, consent_version, consent_at,
      created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      landing_path, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ON CONFLICT(email) DO NOTHING`,
  )
    .bind(
      id,
      data.email,
      data.firstName,
      data.deviceInterest,
      CONSENT_VERSION,
      now,
      now,
      data.utmSource,
      data.utmMedium,
      data.utmCampaign,
      data.utmContent,
      data.utmTerm,
      data.landingPath,
    )
    .run();

  return Number(result.meta.changes ?? 0) > 0;
}
