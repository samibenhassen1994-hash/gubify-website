import type { EventPlan } from "./event-plan-store.ts";
import type { RecipientSource } from "./event-validator.ts";
import {
  createDocument,
  FirestoreRestError,
  getDocument,
  listDocuments,
  patchDocument,
  SERVER_TIMESTAMP,
  type FirestoreDocument,
  type FirestoreRestClient,
  type FirestoreValue,
} from "./firestore-rest.ts";
import type { PushBatchQueue, PushQueue } from "./handler.ts";
import {
  deliveryMessage,
  fanoutMessage,
  MAX_FANOUT_PROCESSING_SUBREQUESTS,
  parsePushQueueMessage,
  type DeliveryMessage,
  type FanoutMessage,
} from "./queue-messages.ts";
import {
  getGoogleAccessToken,
  type GoogleAccessTokenCache,
} from "./service-account-auth.ts";

export const MAX_EXTERNAL_SUBREQUESTS = 40;
export const RECIPIENT_PAGE_SIZE = 4;
export const STALE_RECIPIENT_ENQUEUE_MILLISECONDS = 5 * 60 * 1000;

export interface FanoutConsumerEnv {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  PUSH_FANOUT_QUEUE: PushBatchQueue<FanoutMessage>;
  PUSH_DELIVERY_QUEUE: PushQueue<DeliveryMessage>;
}

export interface FanoutResult {
  externalSubrequests: number;
  recipientsProcessed: number;
  completed: boolean;
  stale: boolean;
}

interface FanoutConsumerDependencies {
  createFirestoreClient?: (env: FanoutConsumerEnv) => Promise<FirestoreRestClient>;
  fetch?: typeof fetch;
  crypto?: Crypto;
  now?: () => number;
}

interface StoredPlan {
  plan: EventPlan;
  updateTime: string;
}

interface RecipientState {
  status: "pending" | "enqueued" | "completed";
  attempts: number;
  enqueuedAt?: Date;
  updateTime: string;
}

interface DiscoveryPage {
  userIds: string[];
  nextCursor: string | null;
}

export class FanoutProcessingError extends Error {
  constructor(message = "Unable to process push fanout") {
    super(message);
    this.name = "FanoutProcessingError";
  }
}

export class FanoutSubrequestBudgetError extends FanoutProcessingError {
  constructor() {
    super("Push fanout subrequest budget exhausted");
    this.name = "FanoutSubrequestBudgetError";
  }
}

class ExternalSubrequestBudget {
  used = 0;
  readonly maximum: number;

  constructor(maximum: number) {
    this.maximum = maximum;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.used >= this.maximum) {
      throw new FanoutSubrequestBudgetError();
    }
    this.used += 1;
    return operation();
  }

  countedFetch(fetchImplementation: typeof fetch): typeof fetch {
    return ((input: RequestInfo | URL, init?: RequestInit) => (
      this.run(() => fetchImplementation(input, init))
    )) as typeof fetch;
  }
}

function isRecord(value: unknown): value is Record<string, FirestoreValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 1500
    && value.trim() === value
    && !/[\/\u0000-\u001f\u007f]/.test(value)
    && value !== "."
    && value !== "..";
}

function requireCondition(condition: unknown): asserts condition {
  if (!condition) throw new FanoutProcessingError();
}

function exactDocumentName(
  firestore: FirestoreRestClient,
  path: string,
): string {
  return `projects/${firestore.projectId}/databases/(default)/documents/${path}`;
}

function parseRecipientSource(value: FirestoreValue, type: EventPlan["type"]): RecipientSource {
  requireCondition(isRecord(value) && typeof value.kind === "string");
  if (value.kind === "users") {
    requireCondition(Array.isArray(value.userIds)
      && value.userIds.every((userId) => isSafeIdentifier(userId)));
    return { kind: "users", userIds: [...value.userIds] as string[] };
  }
  if (value.kind === "gub_members") {
    requireCondition(type === "proposal_created"
      && isSafeIdentifier(value.gubId)
      && isSafeIdentifier(value.excludeUid));
    return { kind: "gub_members", gubId: value.gubId, excludeUid: value.excludeUid };
  }
  if (value.kind === "community_moderators") {
    requireCondition(type === "community_join_request_created"
      && isSafeIdentifier(value.communityId)
      && isSafeIdentifier(value.ownerId)
      && isSafeIdentifier(value.excludeUid));
    return {
      kind: "community_moderators",
      communityId: value.communityId,
      ownerId: value.ownerId,
      excludeUid: value.excludeUid,
    };
  }
  throw new FanoutProcessingError();
}

function parseStoredPlan(
  firestore: FirestoreRestClient,
  eventKey: string,
  document: FirestoreDocument | null,
): StoredPlan {
  requireCondition(document
    && document.name === exactDocumentName(firestore, `pushDeliveryEvents/${eventKey}`)
    && typeof document.updateTime === "string");
  const fields = document.fields;
  requireCondition(fields.schemaVersion === 1
    && fields.eventKey === eventKey
    && typeof fields.type === "string"
    && typeof fields.actorId === "string"
    && typeof fields.title === "string"
    && typeof fields.body === "string"
    && isRecord(fields.data)
    && fields.createdAt instanceof Date
    && isRecord(fields.fanout));
  const fanout = fields.fanout;
  requireCondition(typeof fanout.status === "string"
    && (fanout.cursor === null || typeof fanout.cursor === "string")
    && (fanout.reconcileCursor === undefined
      || fanout.reconcileCursor === null
      || typeof fanout.reconcileCursor === "string")
    && typeof fanout.attempts === "number"
    && Number.isSafeInteger(fanout.attempts)
    && fanout.attempts >= 0
    && typeof fanout.completed === "boolean");
  const type = fields.type as EventPlan["type"];
  const recipientSource = parseRecipientSource(fields.recipientSource, type);
  return {
    plan: {
      ...(fields as unknown as EventPlan),
      type,
      recipientSource,
      fanout: {
        status: fanout.status,
        cursor: fanout.cursor as string | null,
        attempts: fanout.attempts,
        completed: fanout.completed,
        ...(fanout.reconcileCursor === undefined
          ? {}
          : { reconcileCursor: fanout.reconcileCursor as string | null }),
      },
    },
    updateTime: document.updateTime,
  };
}

function documentId(
  firestore: FirestoreRestClient,
  collectionPath: string,
  document: FirestoreDocument,
): string {
  const prefix = `${exactDocumentName(firestore, collectionPath)}/`;
  requireCondition(document.name.startsWith(prefix));
  const id = document.name.slice(prefix.length);
  requireCondition(isSafeIdentifier(id));
  return id;
}

async function discoverRecipients(
  firestore: FirestoreRestClient,
  source: RecipientSource,
  cursor: string | null,
  pageSize: number,
): Promise<DiscoveryPage> {
  if (source.kind === "users") {
    requireCondition(cursor === null);
    return { userIds: [...new Set(source.userIds)], nextCursor: null };
  }

  if (source.kind === "gub_members") {
    const collectionPath = `gubs/${source.gubId}/members`;
    const page = await listDocuments(firestore, collectionPath, {
      pageSize,
      pageToken: cursor ?? undefined,
      orderBy: "__name__",
      mask: ["userId"],
    });
    const userIds = page.documents
      .map((document) => documentId(firestore, collectionPath, document))
      .filter((userId) => userId !== source.excludeUid);
    return { userIds: [...new Set(userIds)], nextCursor: page.nextPageToken ?? null };
  }

  const collectionPath = "platformAdmins";
  const communityPath = `communities/${source.communityId}`;
  const community = await getDocument(firestore, communityPath);
  requireCondition(community
    && community.name === exactDocumentName(firestore, communityPath)
    && isSafeIdentifier(community.fields.ownerId));
  const currentOwnerId = community.fields.ownerId;
  const page = await listDocuments(firestore, collectionPath, {
    pageSize,
    pageToken: cursor ?? undefined,
    orderBy: "__name__",
    mask: ["active"],
  });
  const userIds = currentOwnerId !== source.excludeUid
    ? [currentOwnerId]
    : [];
  for (const document of page.documents) {
    if (document.fields.active === true) {
      const uid = documentId(firestore, collectionPath, document);
      if (uid !== source.excludeUid) userIds.push(uid);
    }
  }
  return { userIds: [...new Set(userIds)], nextCursor: page.nextPageToken ?? null };
}

async function isLiveUser(firestore: FirestoreRestClient, uid: string): Promise<boolean> {
  const user = await getDocument(firestore, `users/${uid}`);
  if (!user || user.name !== exactDocumentName(firestore, `users/${uid}`)) return false;
  const fields = user.fields;
  if ((fields.deletionStatus !== undefined && fields.deletionStatus !== "active")
    || fields.deleted === true
    || fields.deletedAt != null) {
    return false;
  }
  return !await getDocument(firestore, `accountDeletionStates/${uid}`);
}

function parseRecipientState(
  firestore: FirestoreRestClient,
  eventKey: string,
  recipientUid: string,
  document: FirestoreDocument | null,
): RecipientState {
  const path = `pushDeliveryEvents/${eventKey}/recipients/${recipientUid}`;
  requireCondition(document
    && document.name === exactDocumentName(firestore, path)
    && typeof document.updateTime === "string"
    && document.fields.schemaVersion === 1
    && document.fields.eventKey === eventKey
    && document.fields.recipientUid === recipientUid
    && (document.fields.status === "pending"
      || document.fields.status === "enqueued"
      || document.fields.status === "completed")
    && typeof document.fields.attempts === "number"
    && Number.isSafeInteger(document.fields.attempts)
    && document.fields.attempts >= 0);
  const enqueuedAt = document.fields.enqueuedAt;
  requireCondition(enqueuedAt === undefined || enqueuedAt instanceof Date);
  return {
    status: document.fields.status,
    attempts: document.fields.attempts,
    updateTime: document.updateTime,
    ...(enqueuedAt instanceof Date ? { enqueuedAt } : {}),
  };
}

async function ensureRecipient(
  firestore: FirestoreRestClient,
  eventKey: string,
  recipientUid: string,
): Promise<RecipientState> {
  const collectionPath = `pushDeliveryEvents/${eventKey}/recipients`;
  try {
    await createDocument(firestore, collectionPath, recipientUid, {
      schemaVersion: 1,
      eventKey,
      recipientUid,
      status: "pending",
      attempts: 0,
      createdAt: SERVER_TIMESTAMP,
    });
    // Read back the create version so Queue acceptance is followed by a
    // compare-and-set, never an unconditional status regression.
  } catch (error) {
    if (!(error instanceof FirestoreRestError) || error.status !== 409) throw error;
  }
  return parseRecipientState(
    firestore,
    eventKey,
    recipientUid,
    await getDocument(firestore, `${collectionPath}/${recipientUid}`),
  );
}

function needsDeliveryEnqueue(state: RecipientState, nowMilliseconds: number): boolean {
  if (state.status === "completed") return false;
  if (state.status === "pending") return true;
  return !(state.enqueuedAt instanceof Date)
    || state.enqueuedAt.getTime() <= nowMilliseconds - STALE_RECIPIENT_ENQUEUE_MILLISECONDS;
}

async function enqueueRecipient(
  firestore: FirestoreRestClient,
  queue: PushQueue<DeliveryMessage>,
  budget: ExternalSubrequestBudget,
  eventKey: string,
  recipientUid: string,
  nowMilliseconds: number,
): Promise<void> {
  const state = await ensureRecipient(firestore, eventKey, recipientUid);
  await enqueueRecipientState(
    firestore,
    queue,
    budget,
    eventKey,
    recipientUid,
    state,
    nowMilliseconds,
  );
}

async function enqueueRecipientState(
  firestore: FirestoreRestClient,
  queue: PushQueue<DeliveryMessage>,
  budget: ExternalSubrequestBudget,
  eventKey: string,
  recipientUid: string,
  state: RecipientState,
  nowMilliseconds: number,
): Promise<void> {
  if (!needsDeliveryEnqueue(state, nowMilliseconds)) return;
  await budget.run(() => queue.send(deliveryMessage(eventKey, recipientUid)));
  await patchDocument(
    firestore,
    `pushDeliveryEvents/${eventKey}/recipients/${recipientUid}`,
    {
      status: "enqueued",
      attempts: state.attempts + 1,
      enqueuedAt: SERVER_TIMESTAMP,
    },
    {
      updateMask: ["status", "attempts", "enqueuedAt"],
      precondition: { updateTime: state.updateTime },
    },
  );
}

async function reconcileCompletedPlan(
  firestore: FirestoreRestClient,
  env: FanoutConsumerEnv,
  budget: ExternalSubrequestBudget,
  stored: StoredPlan,
  message: FanoutMessage,
  nowMilliseconds: number,
): Promise<FanoutResult> {
  const reconciliationCursor = stored.plan.fanout.reconcileCursor ?? null;
  const messageCursor = message.cursor ?? null;
  if (messageCursor !== reconciliationCursor) {
    await budget.run(() => env.PUSH_FANOUT_QUEUE.send(
      fanoutMessage(message.eventKey, reconciliationCursor),
    ));
    return {
      externalSubrequests: budget.used,
      recipientsProcessed: 0,
      completed: true,
      stale: true,
    };
  }

  const collectionPath = `pushDeliveryEvents/${message.eventKey}/recipients`;
  const page = await listDocuments(firestore, collectionPath, {
    pageSize: RECIPIENT_PAGE_SIZE,
    pageToken: reconciliationCursor ?? undefined,
    orderBy: "__name__",
    mask: ["schemaVersion", "eventKey", "recipientUid", "status", "attempts", "enqueuedAt"],
  });
  let recipientsProcessed = 0;
  for (const document of page.documents) {
    const recipientUid = documentId(firestore, collectionPath, document);
    const state = parseRecipientState(
      firestore,
      message.eventKey,
      recipientUid,
      document,
    );
    await enqueueRecipientState(
      firestore,
      env.PUSH_DELIVERY_QUEUE,
      budget,
      message.eventKey,
      recipientUid,
      state,
      nowMilliseconds,
    );
    recipientsProcessed += 1;
  }

  const nextCursor = page.nextPageToken ?? null;
  if (nextCursor !== reconciliationCursor) {
    await patchDocument(
      firestore,
      `pushDeliveryEvents/${message.eventKey}`,
      { fanout: { reconcileCursor: nextCursor } },
      {
        updateMask: ["fanout.reconcileCursor"],
        precondition: { updateTime: stored.updateTime },
      },
    );
  }
  if (nextCursor !== null) {
    await budget.run(() => env.PUSH_FANOUT_QUEUE.send(
      fanoutMessage(message.eventKey, nextCursor),
    ));
  }

  return {
    externalSubrequests: budget.used,
    recipientsProcessed,
    completed: true,
    stale: false,
  };
}

function countFirestoreClient(
  firestore: FirestoreRestClient,
  budget: ExternalSubrequestBudget,
  fetchImplementation: typeof fetch,
): FirestoreRestClient {
  return {
    ...firestore,
    fetch: budget.countedFetch(firestore.fetch ?? fetchImplementation),
  };
}

export function createFanoutConsumer(
  dependencies: FanoutConsumerDependencies = {},
): (message: FanoutMessage, env: FanoutConsumerEnv, maximumSubrequests?: number) => Promise<FanoutResult> {
  const accessTokenCache: GoogleAccessTokenCache = {};
  const now = dependencies.now ?? Date.now;

  return async (input, env, maximumSubrequests = MAX_FANOUT_PROCESSING_SUBREQUESTS) => {
    const message = parsePushQueueMessage(input);
    requireCondition(message.kind === "fanout");
    requireCondition(Number.isSafeInteger(maximumSubrequests)
      && maximumSubrequests >= 18
      && maximumSubrequests <= MAX_FANOUT_PROCESSING_SUBREQUESTS);
    const budget = new ExternalSubrequestBudget(maximumSubrequests);
    // Worst discovery page: 6 calls per recipient (liveness, create/read,
    // DELIVERY send, CAS), plus 6 fixed calls including cold OAuth and the
    // continuation. Reserve another 6 for the Community owner outside the page.
    const pageSize = Math.min(RECIPIENT_PAGE_SIZE, Math.floor((maximumSubrequests - 12) / 6));
    const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
    requireCondition(typeof fetchImplementation === "function");

    const baseFirestore = dependencies.createFirestoreClient
      ? await dependencies.createFirestoreClient(env)
      : {
          projectId: env.FIREBASE_PROJECT_ID,
          accessToken: await getGoogleAccessToken(env, accessTokenCache, now, {
            fetch: budget.countedFetch(fetchImplementation),
            crypto: dependencies.crypto,
          }),
        };
    const firestore = countFirestoreClient(baseFirestore, budget, fetchImplementation);
    const stored = parseStoredPlan(
      firestore,
      message.eventKey,
      await getDocument(firestore, `pushDeliveryEvents/${message.eventKey}`),
    );

    if (stored.plan.fanout.completed) {
      return reconcileCompletedPlan(firestore, env, budget, stored, message, now());
    }

    const messageCursor = message.cursor ?? null;
    if (messageCursor !== stored.plan.fanout.cursor) {
      await budget.run(() => env.PUSH_FANOUT_QUEUE.send(
        fanoutMessage(message.eventKey, stored.plan.fanout.cursor),
      ));
      return {
        externalSubrequests: budget.used,
        recipientsProcessed: 0,
        completed: false,
        stale: true,
      };
    }

    const page = await discoverRecipients(
      firestore,
      stored.plan.recipientSource,
      stored.plan.fanout.cursor,
      pageSize,
    );
    let recipientsProcessed = 0;
    for (const recipientUid of page.userIds) {
      if (!await isLiveUser(firestore, recipientUid)) continue;
      await enqueueRecipient(
        firestore,
        env.PUSH_DELIVERY_QUEUE,
        budget,
        message.eventKey,
        recipientUid,
        now(),
      );
      recipientsProcessed += 1;
    }

    const completed = page.nextCursor === null;
    await patchDocument(
      firestore,
      `pushDeliveryEvents/${message.eventKey}`,
      {
        fanout: {
          status: completed ? "completed" : "pending",
          cursor: page.nextCursor,
          attempts: stored.plan.fanout.attempts + 1,
          completed,
          reconcileCursor: null,
        },
      },
      {
        updateMask: ["fanout"],
        precondition: { updateTime: stored.updateTime },
      },
    );

    await budget.run(() => env.PUSH_FANOUT_QUEUE.send(
      fanoutMessage(message.eventKey, completed ? null : page.nextCursor),
    ));

    return {
      externalSubrequests: budget.used,
      recipientsProcessed,
      completed,
      stale: false,
    };
  };
}

export const handleFanoutMessage = createFanoutConsumer();
