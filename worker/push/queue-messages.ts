const MAX_EVENT_KEY_BYTES = 1500;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_CURSOR_LENGTH = 4096;

export interface FanoutMessage {
  kind: "fanout";
  eventKey: string;
  cursor?: string;
}

export interface DeliveryMessage {
  kind: "delivery";
  eventKey: string;
  recipientUid: string;
  deviceCursor?: string;
}

export type PushQueueMessage = FanoutMessage | DeliveryMessage;

export interface PushQueueBatchMessage {
  body: unknown;
  ack(): void;
  retry(): void;
}

export interface PushQueueBatch {
  messages: PushQueueBatchMessage[];
}

export class PushQueueMessageError extends Error {
  constructor() {
    super("Invalid push queue message");
    this.name = "PushQueueMessageError";
  }
}

function invalid(): never {
  throw new PushQueueMessageError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIdentifier(value: unknown, maxLength = MAX_IDENTIFIER_LENGTH): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value.trim() === value
    && !/[\/\u0000-\u001f\u007f]/.test(value)
    && value !== "."
    && value !== "..";
}

function isEventKey(value: unknown): value is string {
  return isIdentifier(value, MAX_EVENT_KEY_BYTES)
    && new TextEncoder().encode(value).byteLength <= MAX_EVENT_KEY_BYTES;
}

function isCursor(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_CURSOR_LENGTH
    && value.trim() === value;
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

export function parsePushQueueMessage(value: unknown): PushQueueMessage {
  if (!isRecord(value) || typeof value.kind !== "string" || !isEventKey(value.eventKey)) {
    return invalid();
  }

  if (value.kind === "fanout") {
    if (!hasExactKeys(value, ["kind", "eventKey"], ["cursor"])
      || (value.cursor !== undefined && !isCursor(value.cursor))) {
      return invalid();
    }
    return value as unknown as FanoutMessage;
  }

  if (value.kind === "delivery") {
    if (!hasExactKeys(value, ["kind", "eventKey", "recipientUid"], ["deviceCursor"])
      || !isIdentifier(value.recipientUid)
      || (value.deviceCursor !== undefined && !isCursor(value.deviceCursor))) {
      return invalid();
    }
    return value as unknown as DeliveryMessage;
  }

  return invalid();
}

export function fanoutMessage(eventKey: string, cursor: string | null): FanoutMessage {
  return parsePushQueueMessage({
    kind: "fanout",
    eventKey,
    ...(cursor === null ? {} : { cursor }),
  }) as FanoutMessage;
}

export function deliveryMessage(eventKey: string, recipientUid: string): DeliveryMessage {
  return parsePushQueueMessage({ kind: "delivery", eventKey, recipientUid }) as DeliveryMessage;
}

export async function dispatchPushQueueBatch(
  batch: PushQueueBatch,
  consumeFanout: (message: FanoutMessage) => Promise<unknown>,
): Promise<void> {
  let processedFanout = false;
  for (const queued of batch.messages) {
    let message: PushQueueMessage;
    try {
      message = parsePushQueueMessage(queued.body);
    } catch {
      queued.ack();
      continue;
    }

    if (message.kind === "delivery" || processedFanout) {
      queued.retry();
      continue;
    }

    processedFanout = true;
    try {
      await consumeFanout(message);
      queued.ack();
    } catch {
      queued.retry();
    }
  }
}
