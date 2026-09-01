import { env } from "cloudflare:workers";

import {
  buildDeletionRequestEmail,
  saveDeletionRequest,
  updateDeletionNotificationStatus,
  validateDeletionRequest,
} from "@/lib/delete-account";

type RuntimeEnv = {
  COUNT?: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  DELETE_REQUEST_FROM_EMAIL?: string;
  DELETE_REQUEST_TO_EMAIL?: string;
};

async function verifyTurnstile(token: string, secret: string) {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  if (!response.ok) return false;
  return ((await response.json()) as { success?: boolean }).success === true;
}

async function sendNotification(
  runtime: RuntimeEnv,
  requestId: string,
  data: Exclude<ReturnType<typeof validateDeletionRequest>, { ok: false }>[
    "data"
  ],
) {
  if (
    !runtime.RESEND_API_KEY ||
    !runtime.DELETE_REQUEST_FROM_EMAIL ||
    !runtime.DELETE_REQUEST_TO_EMAIL
  ) {
    return "not_configured" as const;
  }

  const message = buildDeletionRequestEmail(requestId, data);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: runtime.DELETE_REQUEST_FROM_EMAIL,
      to: [runtime.DELETE_REQUEST_TO_EMAIL],
      reply_to: data.email,
      subject: message.subject,
      text: message.text,
    }),
  });

  return response.ok ? ("sent" as const) : ("failed" as const);
}

export async function POST(request: Request) {
  try {
    const validation = validateDeletionRequest(await request.json());
    if (!validation.ok) {
      return Response.json(
        { ok: false, field: validation.field, error: validation.error },
        { status: 400 },
      );
    }

    if (validation.data.website) {
      return Response.json({ ok: true, message: "Request received." });
    }

    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.COUNT || !runtime.TURNSTILE_SECRET_KEY) {
      throw new Error("Runtime unavailable");
    }

    if (
      !(await verifyTurnstile(
        validation.data.turnstileToken,
        runtime.TURNSTILE_SECRET_KEY,
      ))
    ) {
      return Response.json(
        {
          ok: false,
          field: "turnstile",
          error: "Security verification failed. Please try again.",
        },
        { status: 400 },
      );
    }

    const requestId = crypto.randomUUID();
    const now = Date.now();
    const inserted = await saveDeletionRequest(
      runtime.COUNT,
      validation.data,
      now,
      requestId,
    );

    if (!inserted) {
      return Response.json(
        {
          ok: false,
          field: "email",
          error:
            "A deletion request for this email is already being processed.",
        },
        { status: 409 },
      );
    }

    let notificationStatus: "sent" | "failed" | "not_configured" =
      "not_configured";
    try {
      notificationStatus = await sendNotification(
        runtime,
        requestId,
        validation.data,
      );
    } catch {
      notificationStatus = "failed";
    }

    try {
      await updateDeletionNotificationStatus(
        runtime.COUNT,
        requestId,
        notificationStatus,
        Date.now(),
      );
    } catch {
      // The deletion request itself is already stored. A notification status
      // update must never turn a successfully recorded request into a retry.
    }

    return Response.json({
      ok: true,
      requestId,
      message:
        "Deletion request received. Gubify will verify account ownership before deleting data.",
    });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
