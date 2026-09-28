import { parsePushEventRequest, PushRequestError, type PushEventRequest, type PushEventType } from "./contracts.ts";
import { exactTimestamp, getDocument, type FirestoreRestClient, type FirestoreValue } from "./firestore-rest.ts";

// FANOUT must resolve these sources against current state in bounded pages.
// All sources require extant user profiles and absence of accountDeletionStates.
// community_moderators additionally requires the current owner or active=true
// platformAdmins record, deduplicated and excluding excludeUid (never local admins).
export type RecipientSource =
  | { kind: "users"; userIds: string[] }
  | { kind: "gub_members"; gubId: string; excludeUid: string }
  | { kind: "community_moderators"; communityId: string; ownerId: string; excludeUid: string };

export interface ValidatedPushEvent {
  eventKey: string;
  type: PushEventType;
  actorId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  recipientSource: RecipientSource;
}

type Fields = Record<string, FirestoreValue>;

function invalid(): never {
  throw new PushRequestError("Invalid push event", 403);
}

function requireCondition(condition: unknown): asserts condition {
  if (!condition) invalid();
}

function identifier(value: unknown): string {
  requireCondition(typeof value === "string" && value.length > 0 && value.length <= 256
    && value.trim() === value && !/[\/\u0000-\u001f\u007f]/.test(value)
    && value !== "." && value !== ".." && value !== "__deleted_user__");
  return value;
}

function keyComponent(value: string): string {
  // Escape separators as well as percent signs, so (a__b,c) cannot alias (a,b__c).
  return encodeURIComponent(value).replaceAll("_", "%5F");
}

function live(fields: Fields): void {
  requireCondition((fields.deletionStatus === undefined || fields.deletionStatus === "active")
    && fields.deleted !== true && fields.deletedAt == null && fields.archived !== true
    && fields.moderationHidden !== true);
}

async function required(firestore: FirestoreRestClient, path: string): Promise<Fields> {
  const document = await getDocument(firestore, path);
  requireCondition(document && document.name === `projects/${firestore.projectId}/databases/(default)/documents/${path}`);
  live(document.fields);
  return document.fields;
}

async function activeCaller(firestore: FirestoreRestClient, uid: string): Promise<void> {
  await required(firestore, `users/${uid}`);
  requireCondition(!await getDocument(firestore, `accountDeletionStates/${uid}`));
}

function users(uid: unknown, excludeUid?: string): RecipientSource {
  if (uid == null || uid === "" || uid === excludeUid) return { kind: "users", userIds: [] };
  return { kind: "users", userIds: [identifier(uid)] };
}

function event(
  request: PushEventRequest, callerUid: string, components: string[],
  title: string, body: string, data: Record<string, string>, recipientSource: RecipientSource,
): ValidatedPushEvent {
  const eventKey = [request.type, ...components].join("__");
  requireCondition(new TextEncoder().encode(eventKey).byteLength <= 1500);
  return { eventKey, type: request.type, actorId: callerUid, title, body, data, recipientSource };
}

export async function validatePushEvent(
  input: PushEventRequest, callerUid: string, firestore: FirestoreRestClient,
): Promise<ValidatedPushEvent> {
  const request = parsePushEventRequest(input);
  identifier(callerUid);
  for (const [key, value] of Object.entries(request)) if (key !== "type") identifier(value);
  await activeCaller(firestore, callerUid);

  if (request.type === "task_assigned" || request.type === "proposal_created") {
    const { gubId } = request;
    const gub = await required(firestore, `gubs/${gubId}`);
    requireCondition(gub.gubId === undefined || gub.gubId === gubId);
    // Rules grant creation to current members, not a stale creator/owner field.
    await required(firestore, `gubs/${gubId}/members/${callerUid}`);
    if (request.type === "task_assigned") {
      const { taskId } = request;
      const task = await required(firestore, `gubs/${gubId}/tasks/${taskId}`);
      requireCondition(task.gubId === gubId && task.taskId === taskId
        && task.creatorId === callerUid && task.status === "active"
        && task.archived === false && task.completedAt == null && task.completedBy == null);
      return event(request, callerUid, [gubId, taskId].map(keyComponent),
        "New task assigned", "You have been assigned a task.", { gubId, taskId }, users(task.assignedUserId, callerUid));
    }
    const { proposalId } = request;
    const proposal = await required(firestore, `gubs/${gubId}/proposals/${proposalId}`);
    requireCondition(proposal.gubId === gubId && proposal.proposalId === proposalId
      && proposal.creatorId === callerUid && proposal.status === "voting"
      && proposal.resultProcessed === false && proposal.eventCreated === false && proposal.tasksCreated === false);
    // Deliberately no member listing: this descriptor is consumed by FANOUT.
    return event(request, callerUid, [gubId, proposalId].map(keyComponent),
      "New proposal", "A new proposal is ready for your vote.", { gubId, proposalId },
      { kind: "gub_members", gubId, excludeUid: callerUid });
  }

  const { communityId } = request;
  const community = await required(firestore, `communities/${communityId}`);
  requireCondition(community.communityId === undefined || community.communityId === communityId);
  const ownerId = identifier(community.ownerId);

  if (request.type === "community_answer_created" || request.type === "community_best_answer_selected") {
    const { askId, answerId } = request;
    await required(firestore, `communities/${communityId}/members/${callerUid}`);
    const ask = await required(firestore, `communities/${communityId}/asks/${askId}`);
    const answer = await required(firestore, `communities/${communityId}/asks/${askId}/answers/${answerId}`);
    requireCondition(ask.askId === askId && ask.communityId === communityId && answer.answerId === answerId);
    const askAuthorId = identifier(ask.authorId);
    const answerAuthorId = identifier(answer.authorId);
    requireCondition(answerId === answerAuthorId);
    const data = { communityId, askId, answerId };
    const components = [communityId, askId, answerId].map(keyComponent);
    if (request.type === "community_answer_created") {
      requireCondition(answerAuthorId === callerUid && ask.status === "active");
      return event(request, callerUid, components, "New answer", "Your Ask has a new answer.", data, users(askAuthorId, answerAuthorId));
    }
    requireCondition(askAuthorId === callerUid && ask.status === "resolved"
      && ask.bestAnswerId === answerId && ask.bestAnswerAuthorId === answerAuthorId
      && answerAuthorId !== askAuthorId && exactTimestamp(ask.resolvedAt));
    return event(request, callerUid, components, "Best Answer selected", "Your answer was selected as the Best Answer.", data, users(answerAuthorId));
  }

  const { requesterUid } = request;
  const join = await required(firestore, `communities/${communityId}/joinRequests/${requesterUid}`);
  requireCondition(join.userId === requesterUid && (community.accessMode ?? "approval") === "approval");
  const requestedAt = exactTimestamp(join.requestedAt);
  const createdAt = exactTimestamp(join.createdAt);
  requireCondition(requestedAt && createdAt && requestedAt >= createdAt);
  const components = [keyComponent(communityId), keyComponent(requesterUid), requestedAt];
  if (request.type === "community_join_request_created") {
    requireCondition(callerUid === requesterUid && join.status === "pending" && join.resolvedAt == null && join.resolvedBy == null);
    return event(request, callerUid, components, "New join request", "Someone requested to join your Community.",
      { communityId, requesterUid }, { kind: "community_moderators", communityId, ownerId, excludeUid: requesterUid });
  }
  requireCondition((join.status === "approved" || join.status === "rejected") && join.resolvedBy === callerUid
    && callerUid !== requesterUid && requesterUid !== ownerId);
  const resolvedAt = exactTimestamp(join.resolvedAt);
  requireCondition(resolvedAt && resolvedAt >= requestedAt);
  if (callerUid !== ownerId) {
    const admin = await required(firestore, `platformAdmins/${callerUid}`);
    requireCondition(admin.active === true);
  }
  return event(request, callerUid, [...components, join.status],
    join.status === "approved" ? "Join request approved" : "Join request rejected",
    join.status === "approved" ? "Your request to join the Community was approved." : "Your request to join the Community was rejected.",
    { communityId, requesterUid, status: join.status }, users(join.userId));
}
