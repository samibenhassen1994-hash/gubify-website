import type { PushEventType } from "./contracts.ts";
import type { ValidatedPushEvent } from "./event-validator.ts";

// Shared with Flutter's high-importance channel registration (Task 14).
export const GLOBAL_PUSH_ANDROID_CHANNEL_ID = "gubify_global_notifications";
const ROUTING_KEYS: Record<PushEventType, readonly string[]> = {
  task_assigned: ["gubId", "taskId"],
  proposal_created: ["gubId", "proposalId"],
  community_answer_created: ["communityId", "askId", "answerId"],
  community_best_answer_selected: ["communityId", "askId", "answerId"],
  community_join_request_created: ["communityId", "requesterUid"],
  community_join_request_resolved: ["communityId", "requesterUid", "status"],
};

export interface FcmMessage {
  token: string;
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: {
    priority: "HIGH";
    collapse_key: string;
    notification: { tag: string; channel_id: string };
  };
  apns: { headers: { "apns-collapse-id": string } };
}

export type FcmSendResult = "sent" | "invalid_token" | "retryable";

export class PushPayloadError extends Error {
  constructor() {
    super("Invalid push payload");
    this.name = "PushPayloadError";
  }
}

function requireCondition(condition: unknown): asserts condition {
  if (!condition) throw new PushPayloadError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown, limit = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit
    && value.trim() === value && !/[\/\u0000-\u001f\u007f]/.test(value)
    && value !== "." && value !== "..";
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildFcmMessage(
  event: Pick<ValidatedPushEvent, "eventKey" | "type" | "title" | "body" | "data">,
  recipientUid: string,
  token: string,
): Promise<FcmMessage> {
  requireCondition(event && Object.hasOwn(ROUTING_KEYS, event.type)
    && identifier(event.eventKey, 1500)
    && new TextEncoder().encode(event.eventKey).byteLength <= 1500
    && identifier(recipientUid)
    && typeof token === "string" && token.length > 0 && token.length <= 4096
    && typeof event.title === "string" && event.title.length > 0 && event.title.length <= 120
    && typeof event.body === "string" && event.body.length > 0 && event.body.length <= 500
    && isRecord(event.data));
  const keys = ROUTING_KEYS[event.type];
  requireCondition(Object.keys(event.data).length === keys.length
    && keys.every(key => Object.hasOwn(event.data, key) && identifier(event.data[key])));
  if (event.type === "community_join_request_resolved") {
    requireCondition(event.data.status === "approved" || event.data.status === "rejected");
  }
  const notificationId = await digest(JSON.stringify(["global-push-v1", event.eventKey, recipientUid]));
  // Hashing, not truncation: long event keys remain distinct and fit APNs' 64 bytes.
  const collapseId = await digest(event.eventKey);
  const payload = {
    notification: { title: event.title, body: event.body },
    data: { ...event.data, notificationId, eventKey: event.eventKey, type: event.type },
    android: {
      priority: "HIGH" as const,
      collapse_key: collapseId,
      notification: { tag: collapseId, channel_id: GLOBAL_PUSH_ANDROID_CHANNEL_ID },
    },
    apns: { headers: { "apns-collapse-id": collapseId } },
  };
  requireCondition(new TextEncoder().encode(JSON.stringify(payload)).byteLength <= 4096);
  return { token, ...payload };
}

export async function sendFcmMessage(
  client: { projectId: string; accessToken: string; fetch?: typeof fetch },
  message: FcmMessage,
): Promise<FcmSendResult> {
  // Never log or rethrow fetch/response text: either can contain full tokens.
  try {
    const response = await (client.fetch ?? globalThis.fetch)(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(client.projectId)}/messages:send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${client.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      },
    );
    const body: unknown = await response.json();
    if (response.ok) {
      return isRecord(body) && typeof body.name === "string" && body.name.length > 0 ? "sent" : "retryable";
    }
    if (!isRecord(body) || !isRecord(body.error) || !Array.isArray(body.error.details)) return "retryable";
    const details = body.error.details.filter(isRecord);
    const codes = details.filter(detail => detail["@type"] === "type.googleapis.com/google.firebase.fcm.v1.FcmError")
      .map(detail => detail.errorCode);
    if (codes.length !== 1) return "retryable";
    if (response.status === 404 && codes[0] === "UNREGISTERED") return "invalid_token";
    const violations = details.filter(detail => detail["@type"] === "type.googleapis.com/google.rpc.BadRequest")
      .flatMap(detail => Array.isArray(detail.fieldViolations) ? detail.fieldViolations : []);
    if (response.status === 400 && codes[0] === "INVALID_ARGUMENT"
      && violations.length > 0
      && violations.every(violation => isRecord(violation) && violation.field === "message.token")) {
      return "invalid_token";
    }
    // Auth, quota, payload, server and unrecognized errors do not prove that a
    // registration is dead. Keep it, and let Queue retry under its policy.
    return "retryable";
  } catch {
    return "retryable";
  }
}
