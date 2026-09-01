type D1Database = import("@miniflare/d1").D1Database;

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    COUNT?: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    RESEND_API_KEY?: string;
    DELETE_REQUEST_FROM_EMAIL?: string;
    DELETE_REQUEST_TO_EMAIL?: string;
    [key: string]: unknown;
  };
}
