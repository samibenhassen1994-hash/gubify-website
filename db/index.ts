import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.COUNT) {
    throw new Error(
      "Cloudflare D1 binding `COUNT` is unavailable. Set the `d1` field in .openai/hosting.json to `COUNT` and configure the D1 binding before using the database."
    );
  }

  return drizzle(env.COUNT, { schema });
}
