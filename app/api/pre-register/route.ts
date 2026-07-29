import { env } from "cloudflare:workers";
import { clearProgressCache } from "@/lib/pre-registration-cache";
import {
  savePreRegistration,
  validateRegistrationPayload,
} from "@/lib/pre-registration";

type RuntimeEnv = {
  COUNT?: D1Database;
  TURNSTILE_SECRET_KEY?: string;
};

type TurnstileResponse = {
  success?: boolean;
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
  const result = (await response.json()) as TurnstileResponse;
  return result.success === true;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validation = validateRegistrationPayload(payload);

    if (!validation.ok) {
      return Response.json(
        { ok: false, field: validation.field, error: validation.error },
        { status: 400 },
      );
    }

    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.COUNT || !runtime.TURNSTILE_SECRET_KEY) {
      return Response.json(
        { ok: false, error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    const turnstileValid = await verifyTurnstile(
      validation.data.turnstileToken,
      runtime.TURNSTILE_SECRET_KEY,
    );
    if (!turnstileValid) {
      return Response.json(
        {
          ok: false,
          field: "turnstile",
          error: "Security verification failed. Please try again.",
        },
        { status: 400 },
      );
    }

    const created = await savePreRegistration(
      runtime.COUNT,
      validation.data,
      Date.now(),
      crypto.randomUUID(),
    );
    if (created) clearProgressCache();

    return Response.json({
      ok: true,
      alreadyRegistered: !created,
      message: created ? "You're on the list!" : "You're already on the list!",
    });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
