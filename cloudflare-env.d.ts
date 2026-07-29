type D1Database = import("@miniflare/d1").D1Database;

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    [key: string]: unknown;
  };
}
