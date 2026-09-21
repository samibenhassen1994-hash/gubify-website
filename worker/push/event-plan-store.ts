import {
  createDocument,
  FirestoreRestError,
  getDocument,
  patchDocument,
  SERVER_TIMESTAMP,
  type FirestoreDocument,
  type FirestoreRestClient,
} from "./firestore-rest.ts";
import type { ValidatedPushEvent } from "./event-validator.ts";

export interface EventPlan extends ValidatedPushEvent {
  schemaVersion: 1;
  createdAt: Date;
  fanout: {
    status: string;
    cursor: string | null;
    attempts: number;
    completed: boolean;
    reconcileCursor?: string | null;
  };
}

export interface EventPlanSnapshot extends EventPlan {
  updateTime: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNarrowCommunityOwnerRefresh(
  stored: unknown,
  validated: ValidatedPushEvent["recipientSource"],
): boolean {
  if (!isRecord(stored)
    || stored.kind !== "community_moderators"
    || validated.kind !== "community_moderators"
    || stable(Object.keys(stored).sort()) !== stable([
      "communityId",
      "excludeUid",
      "kind",
      "ownerId",
    ])) {
    return false;
  }
  return stored.communityId === validated.communityId
    && stored.excludeUid === validated.excludeUid
    && typeof stored.ownerId === "string"
    && stored.ownerId !== validated.ownerId;
}

export function createEventPlanStore(firestore: FirestoreRestClient) {
  return {
    async ensureEventPlan(validated: ValidatedPushEvent): Promise<EventPlanSnapshot> {
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
      const documentPath = `pushDeliveryEvents/${validated.eventKey}`;
      let document = await getDocument(firestore, documentPath);
      if (!document
        || document.name !== `projects/${firestore.projectId}/databases/(default)/documents/pushDeliveryEvents/${validated.eventKey}`
        || typeof document.updateTime !== "string") {
        throw new EventPlanMismatchError();
      }
      for (const [key, value] of Object.entries(immutable)) {
        if (key === "recipientSource") continue;
        if (stable(document.fields[key]) !== stable(value)) throw new EventPlanMismatchError();
      }
      if (stable(document.fields.recipientSource) !== stable(immutable.recipientSource)) {
        if (!isNarrowCommunityOwnerRefresh(
          document.fields.recipientSource,
          validated.recipientSource,
        )) {
          throw new EventPlanMismatchError();
        }
        const refreshed = await patchDocument(
          firestore,
          documentPath,
          { recipientSource: validated.recipientSource },
          {
            updateMask: ["recipientSource"],
            precondition: { updateTime: document.updateTime },
          },
        );
        if (!("fields" in refreshed)) throw new EventPlanMismatchError();
        document = refreshed as FirestoreDocument;
      }
      const { createdAt, fanout } = document.fields;
      if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime()) || !fanout
        || typeof fanout !== "object" || !("status" in fanout) || typeof fanout.status !== "string"
        || !("cursor" in fanout) || (fanout.cursor !== null && typeof fanout.cursor !== "string")
        || !("attempts" in fanout) || typeof fanout.attempts !== "number" || !Number.isSafeInteger(fanout.attempts) || fanout.attempts < 0
        || !("completed" in fanout) || typeof fanout.completed !== "boolean"
        || ("reconcileCursor" in fanout
          && fanout.reconcileCursor !== null
          && typeof fanout.reconcileCursor !== "string")) throw new EventPlanMismatchError();
      // Preserve mutable progress; never replace an existing plan on HTTP retry.
      return {
        ...(document.fields as unknown as EventPlan),
        updateTime: document.updateTime,
      };
    },
  };
}
