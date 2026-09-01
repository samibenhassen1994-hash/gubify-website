export type AccountDeletionRequestData = {
  email: string;
  displayName: string | null;
  notes: string | null;
  confirmation: true;
  turnstileToken: string;
  website: string | null;
};

const clean = (value: unknown, max: number) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\u0000/g, "");
  return normalized && normalized.length <= max ? normalized : null;
};

const optional = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === "") return null;
  return clean(value, max);
};

export function validateDeletionRequest(input: unknown):
  | { ok: true; data: AccountDeletionRequestData }
  | { ok: false; field?: string; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid submission." };
  }

  const value = input as Record<string, unknown>;
  const email = clean(value.email, 254)?.toLowerCase() ?? null;
  if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    return { ok: false, field: "email", error: "Enter a valid email address." };
  }

  if (value.confirmation !== true) {
    return {
      ok: false,
      field: "confirmation",
      error: "Confirm that you are requesting permanent account deletion.",
    };
  }

  const turnstileToken = clean(value.turnstileToken, 2048);
  if (!turnstileToken) {
    return {
      ok: false,
      field: "turnstile",
      error: "Complete the security check.",
    };
  }

  return {
    ok: true,
    data: {
      email,
      displayName: optional(value.displayName, 80),
      notes: optional(value.notes, 2000),
      confirmation: true,
      turnstileToken,
      website: optional(value.website, 200),
    },
  };
}

export async function saveDeletionRequest(
  database: D1Database,
  data: AccountDeletionRequestData,
  now: number,
  id: string,
) {
  await database
    .prepare(`INSERT INTO account_deletion_requests (
      id, email, display_name, notes, confirmation, status,
      notification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`)
    .bind(
      id,
      data.email,
      data.displayName,
      data.notes,
      "new",
      "pending",
      now,
      now,
    )
    .run();
}

export async function updateDeletionNotificationStatus(
  database: D1Database,
  id: string,
  status: "sent" | "failed" | "not_configured",
  now: number,
) {
  await database
    .prepare(
      "UPDATE account_deletion_requests SET notification_status = ?, updated_at = ? WHERE id = ?",
    )
    .bind(status, now, id)
    .run();
}

export function buildDeletionRequestEmail(
  id: string,
  data: AccountDeletionRequestData,
) {
  const lines = [
    "A new Gubify account deletion request was submitted.",
    "",
    `Request ID: ${id}`,
    `Account email: ${data.email}`,
    `Display name: ${data.displayName ?? "Not provided"}`,
    "",
    "Notes:",
    data.notes ?? "No notes provided.",
    "",
    "The request must be verified before deleting any account or personal data.",
  ];

  return {
    subject: `Gubify account deletion request — ${id}`,
    text: lines.join("\n"),
  };
}
