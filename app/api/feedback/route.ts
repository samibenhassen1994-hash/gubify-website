import { env } from "cloudflare:workers";
import { saveFeedback, validateFeedback } from "@/lib/feedback";

type RuntimeEnv = { COUNT?: D1Database; TURNSTILE_SECRET_KEY?: string };

async function verifyTurnstile(token: string, secret: string) {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  return ((await response.json()) as { success?: boolean }).success === true;
}

export async function POST(request: Request) {
  try {
    const validation = validateFeedback(await request.json());
    if (!validation.ok) return Response.json({ ok: false, field: validation.field, error: validation.error }, { status: 400 });
    if (validation.data.website) return Response.json({ ok: true, message: "Feedback received." });
    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.COUNT || !runtime.TURNSTILE_SECRET_KEY) throw new Error("Runtime unavailable");
    if (!await verifyTurnstile(validation.data.turnstileToken, runtime.TURNSTILE_SECRET_KEY)) {
      return Response.json({ ok: false, field: "turnstile", error: "Security verification failed. Please try again." }, { status: 400 });
    }
    await saveFeedback(runtime.COUNT, validation.data, Date.now(), crypto.randomUUID());
    return Response.json({ ok: true, message: validation.data.type === "bug" ? "Bug report received" : "Feature suggestion received" });
  } catch {
    return Response.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
