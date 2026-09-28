export const PUSH_EVENT_TYPES = [
  "task_assigned",
  "proposal_created",
  "community_answer_created",
  "community_best_answer_selected",
  "community_join_request_created",
  "community_join_request_resolved",
] as const;

export type PushEventType = (typeof PUSH_EVENT_TYPES)[number];

export type PushEventRequest =
  | { type: "task_assigned"; gubId: string; taskId: string }
  | { type: "proposal_created"; gubId: string; proposalId: string }
  | {
      type: "community_answer_created";
      communityId: string;
      askId: string;
      answerId: string;
    }
  | {
      type: "community_best_answer_selected";
      communityId: string;
      askId: string;
      answerId: string;
    }
  | {
      type: "community_join_request_created";
      communityId: string;
      requesterUid: string;
    }
  | {
      type: "community_join_request_resolved";
      communityId: string;
      requesterUid: string;
    };

export const MAX_PUSH_EVENT_BODY_BYTES = 4096;
const MAX_IDENTIFIER_LENGTH = 256;

const REQUIRED_KEYS: Record<PushEventType, readonly string[]> = {
  task_assigned: ["type", "gubId", "taskId"],
  proposal_created: ["type", "gubId", "proposalId"],
  community_answer_created: ["type", "communityId", "askId", "answerId"],
  community_best_answer_selected: ["type", "communityId", "askId", "answerId"],
  community_join_request_created: ["type", "communityId", "requesterUid"],
  community_join_request_resolved: ["type", "communityId", "requesterUid"],
};

export class PushRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PushRequestError";
    this.status = status;
  }
}

function invalidRequest(): never {
  throw new PushRequestError("Invalid push event request", 400);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    value.trim() === value
  );
}

export function parsePushEventRequest(value: unknown): PushEventRequest {
  if (!isRecord(value) || typeof value.type !== "string") {
    return invalidRequest();
  }

  if (!Object.prototype.hasOwnProperty.call(REQUIRED_KEYS, value.type)) {
    return invalidRequest();
  }
  const type = value.type as PushEventType;
  const requiredKeys = REQUIRED_KEYS[type];

  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...requiredKeys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return invalidRequest();
  }

  for (const key of requiredKeys) {
    if (key !== "type" && !isIdentifier(value[key])) {
      return invalidRequest();
    }
  }

  return value as PushEventRequest;
}

export async function readPushEventRequest(request: Request): Promise<PushEventRequest> {
  if (request.method !== "POST") {
    throw new PushRequestError("Method not allowed", 405);
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_PUSH_EVENT_BODY_BYTES) {
      throw new PushRequestError("Push event request is too large", 413);
    }
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        totalBytes += value.byteLength;
        if (totalBytes > MAX_PUSH_EVENT_BODY_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // The size rejection remains authoritative if cancellation itself fails.
          }
          throw new PushRequestError("Push event request is too large", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PushRequestError("Invalid push event request", 400);
  }
  return parsePushEventRequest(value);
}
