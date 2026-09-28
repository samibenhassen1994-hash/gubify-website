type D1Database = import("@miniflare/d1").D1Database;

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface PushQueueBinding<Message = unknown> {
  send(message: Message): Promise<void>;
  sendBatch(messages: Array<{ body: Message }>): Promise<void>;
}

interface PushFanoutQueueMessage {
  kind: "fanout";
  eventKey: string;
  cursor?: string;
}

interface PushDeliveryQueueMessage {
  kind: "delivery";
  eventKey: string;
  recipientUid: string;
  deviceCursor?: string;
}

interface PushRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

declare module "cloudflare:workers" {
  export const env: {
    COUNT?: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    RESEND_API_KEY?: string;
    DELETE_REQUEST_FROM_EMAIL?: string;
    DELETE_REQUEST_TO_EMAIL?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;
    PUSH_FANOUT_QUEUE?: PushQueueBinding<PushFanoutQueueMessage>;
    PUSH_DELIVERY_QUEUE?: PushQueueBinding<PushDeliveryQueueMessage>;
    PUSH_EVENTS_RATE_LIMITER?: PushRateLimitBinding;
    [key: string]: unknown;
  };
}
