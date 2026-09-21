import { createDocument, FirestoreRestError, getDocument, SERVER_TIMESTAMP, type FirestoreRestClient } from "./firestore-rest.ts";
import type { ValidatedPushEvent } from "./event-validator.ts";

export interface EventPlan extends ValidatedPushEvent {
  schemaVersion: 1;
  createdAt: Date;
  fanout: { status: string; cursor: string | null; attempts: number; completed: boolean };
}

export class EventPlanMismatchError extends Error {
  constructor() {
    super("Event plan mismatch");
    this.name = "EventPlanMismatchError";
  }
}

function canonical(event: ValidatedPushEvent) {
  return {
    schemaVersion: 1 as const, eventKey: event.eventKey, type: event.type, actorId: event.actorId,
    title: event.title, body: event.body, data: event.data, recipientSource: event.recipientSource,
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function createEventPlanStore(firestore: FirestoreRestClient) {
  return {
    async ensureEventPlan(validated: ValidatedPushEvent): Promise<EventPlan> {
      const immutable = canonical(validated);
      try {
        await createDocument(firestore, "pushDeliveryEvents", validated.eventKey, {
          ...immutable, createdAt: SERVER_TIMESTAMP,
          fanout: { status: "pending", cursor: null, attempts: 0, completed: false },
        });
      } catch (error) {
        // Only an actual already-exists conflict permits the duplicate path.
        if (!(error instanceof FirestoreRestError) || error.status !== 409) throw error;
      }
      const document = await getDocument(firestore, `pushDeliveryEvents/${validated.eventKey}`);
      if (!document || document.name !== `projects/${firestore.projectId}/databases/(default)/documents/pushDeliveryEvents/${validated.eventKey}`) {
        throw new EventPlanMismatchError();
      }
      for (const [key, value] of Object.entries(immutable)) {
        if (stable(document.fields[key]) !== stable(value)) throw new EventPlanMismatchError();
      }
      const { createdAt, fanout } = document.fields;
      if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime()) || !fanout
        || typeof fanout !== "object" || !("status" in fanout) || typeof fanout.status !== "string"
        || !("cursor" in fanout) || (fanout.cursor !== null && typeof fanout.cursor !== "string")
        || !("attempts" in fanout) || typeof fanout.attempts !== "number" || !Number.isSafeInteger(fanout.attempts) || fanout.attempts < 0
        || !("completed" in fanout) || typeof fanout.completed !== "boolean") throw new EventPlanMismatchError();
      // Preserve mutable progress; never replace an existing plan on HTTP retry.
      return document.fields as unknown as EventPlan;
    },
  };
}
