import { env } from "cloudflare:workers";
import {
  readCachedProgress,
  writeCachedProgress,
} from "@/lib/pre-registration-cache";

type RuntimeEnv = {
  COUNT?: D1Database;
};

export async function GET() {
  try {
    const cached = readCachedProgress();
    if (cached) {
      return Response.json(cached, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" },
      });
    }

    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.COUNT) throw new Error("D1 unavailable");

    const row = await runtime.COUNT.prepare(
      "SELECT COUNT(*) AS count FROM pre_registrations WHERE status = ?",
    )
      .bind("active")
      .first<{ count: number }>();

    const progress = writeCachedProgress(Number(row?.count ?? 0));
    return Response.json(progress, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" },
    });
  } catch {
    return Response.json(
      { error: "Registration counter temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
