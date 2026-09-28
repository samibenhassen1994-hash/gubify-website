const MAX_EVENT_KEY_BYTES = 1500;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_CURSOR_LENGTH = 4096;
export const MAX_QUEUE_BATCH_MESSAGES = 100;
export const MAX_FANOUT_PROCESSING_SUBREQUESTS = 39;
// Leave 16 KiB below Queue's 256 KiB aggregate limit, in addition to the
// serialized JSON envelope, per-message metadata, and batch framing below.
const MAX_DEFERRED_BATCH_BYTES = 240 * 1024;
const MAX_QUEUE_MESSAGE_BYTES = 128 * 1024;
const QUEUE_BATCH_ENVELOPE_BYTES = 1024;
const QUEUE_MESSAGE_ENVELOPE_BYTES = 128;

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

export interface PushQueueBatchDispatchResult {
  externalSubrequests: number;
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
  consumeFanout: (message: FanoutMessage, maximumSubrequests: number) => Promise<{ externalSubrequests: number }>,
  deferFanouts: (messages: FanoutMessage[]) => Promise<void>,
  delivery?: {
    consume: (message: DeliveryMessage, maximumSubrequests: number) => Promise<{ externalSubrequests: number }>;
    defer: (messages: DeliveryMessage[]) => Promise<void>;
  },
): Promise<PushQueueBatchDispatchResult> {
  if (!Array.isArray(batch.messages) || batch.messages.length > MAX_QUEUE_BATCH_MESSAGES) {
    throw new PushQueueMessageError();
  }
  const fanouts: Array<{ queued: PushQueueBatchMessage; message: PushQueueMessage; bytes: number }> = [];
  for (const queued of batch.messages) {
    let message: PushQueueMessage;
    try {
      message = parsePushQueueMessage(queued.body);
    } catch {
      queued.ack();
      continue;
    }

    if (message.kind === "delivery" && !delivery) {
      queued.retry();
      continue;
    }

    try {
      const bytes = new TextEncoder().encode(JSON.stringify({ body: message, contentType: "json" })).byteLength
        + QUEUE_MESSAGE_ENVELOPE_BYTES;
      if (bytes >= MAX_QUEUE_MESSAGE_BYTES
        || bytes + QUEUE_BATCH_ENVELOPE_BYTES > MAX_DEFERRED_BATCH_BYTES) {
        // Deterministic poison, never a retry loop. The bounded schema keeps
        // every valid 4096-character cursor well below this singleton limit.
        queued.ack();
        continue;
      }
      fanouts.push({ queued, message, bytes });
    } catch {
      queued.ack();
    }
  }

  const first = fanouts.shift();
  if (!first) return { externalSubrequests: 0 };
  // Group by destination Queue before chunking. Alternating message kinds must
  // not turn a bounded 100-message batch into 99 separate sendBatch calls.
  fanouts.sort((left, right) => left.message.kind.localeCompare(right.message.kind));
  const deferredBatches: typeof fanouts[] = [];
  let deferred: typeof fanouts = [];
  let batchBytes = QUEUE_BATCH_ENVELOPE_BYTES;
  for (const item of fanouts) {
    if ((deferred.length > 0 && deferred[0].message.kind !== item.message.kind)
      || deferred.length >= MAX_QUEUE_BATCH_MESSAGES
      || batchBytes + item.bytes > MAX_DEFERRED_BATCH_BYTES) {
      deferredBatches.push(deferred);
      deferred = [];
      batchBytes = QUEUE_BATCH_ENVELOPE_BYTES;
    }
    deferred.push(item);
    batchBytes += item.bytes;
  }
  if (deferred.length > 0) deferredBatches.push(deferred);

  // Plan every send before doing external work. The current schema permits
  // at most 14 chunks for mixed kinds, leaving >=26 processing calls.
  const maximumProcessingSubrequests = Math.min(
    MAX_FANOUT_PROCESSING_SUBREQUESTS,
    MAX_FANOUT_PROCESSING_SUBREQUESTS + 1 - deferredBatches.length,
  );
  let processingSubrequests = 0;
  try {
    const result = first.message.kind === "fanout"
      ? await consumeFanout(first.message, maximumProcessingSubrequests)
      : await delivery!.consume(first.message, maximumProcessingSubrequests);
    if (!Number.isSafeInteger(result.externalSubrequests)
      || result.externalSubrequests < 0
      || result.externalSubrequests > maximumProcessingSubrequests) {
      throw new PushQueueMessageError();
    }
    processingSubrequests = result.externalSubrequests;
    first.queued.ack();
  } catch {
    // A failed consumer may have used its full allowance before throwing.
    processingSubrequests = maximumProcessingSubrequests;
    first.queued.retry();
  }

  for (const chunk of deferredBatches) {
    try {
      if (chunk[0].message.kind === "fanout") {
        await deferFanouts(chunk.map(({ message }) => message as FanoutMessage));
      } else {
        await delivery!.defer(chunk.map(({ message }) => message as DeliveryMessage));
      }
      for (const { queued } of chunk) queued.ack();
    } catch {
      // Acceptance/ack is independent per chunk. A failed send retains only
      // its originals; accepted chunks never spend their retry allowance.
      for (const { queued } of chunk) queued.retry();
    }
  }
  return { externalSubrequests: processingSubrequests + deferredBatches.length };
}
