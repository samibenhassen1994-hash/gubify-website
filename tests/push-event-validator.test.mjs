import assert from "node:assert/strict";
import test from "node:test";

const validator = await import("../worker/push/event-validator.ts").catch(() => ({}));
const root = "projects/push-test/databases/(default)/documents/";
const stamp = (value = "2026-09-21T10:00:00.123456Z") => ({ timestampValue: value });
function wire(value) {
  if (value?.timestampValue) return value;
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  return { stringValue: value };
}
function fixtures() {
  return {
    "users/actor": { displayName: "Actor" },
    "users/asker": { displayName: "Asker" },
    "users/owner": { displayName: "Owner" },
    "users/admin": { displayName: "Admin" },
    "gubs/g": { ownerId: "owner", deletionStatus: "active" },
    "gubs/g/members/actor": { userId: "actor", role: "member" },
    "gubs/g/tasks/t": { gubId: "g", taskId: "t", creatorId: "actor", assignedUserId: "recipient", title: "Authoritative task", status: "active", archived: false, createdAt: stamp(), completedAt: null, completedBy: null },
    "gubs/g/proposals/p": { gubId: "g", proposalId: "p", creatorId: "actor", title: "Authoritative proposal", status: "voting", resultProcessed: false, eventCreated: false, tasksCreated: false, createdAt: stamp(), expiresAt: stamp("2027-01-01T00:00:00Z") },
    "communities/c": { communityId: "c", ownerId: "owner", name: "Our community", accessMode: "approval", deletionStatus: "active" },
    "communities/c/members/actor": { userId: "actor" },
    "communities/c/members/asker": { userId: "asker" },
    "communities/c/asks/a": { communityId: "c", askId: "a", authorId: "asker", status: "active", text: "A question", createdAt: stamp() },
    "communities/c/asks/a/answers/actor": { answerId: "actor", authorId: "actor", text: "An answer", createdAt: stamp() },
    "communities/c/joinRequests/actor": { userId: "actor", displayName: "Actor", status: "pending", createdAt: stamp("2026-09-20T10:00:00Z"), requestedAt: stamp() },
    "platformAdmins/admin": { active: true },
  };
}
function client(docs) {
  const calls = [];
  return {
    calls, projectId: "push-test", accessToken: "mock-access",
    async fetch(input, init) {
      const url = new URL(input);
      const path = decodeURIComponent(url.pathname.split("/documents/")[1] ?? "");
      calls.push({ path, method: init?.method ?? "GET" });
      assert.equal(init?.method ?? "GET", "GET", "validation must never write or send");
      assert.equal(url.search, "", "no listing/query/pagination in HTTP validation");
      if (!(path in docs)) return new Response(null, { status: 404 });
      return Response.json({ name: root + path, fields: Object.fromEntries(Object.entries(docs[path]).map(([key, value]) => [key, wire(value)])) });
    },
  };
}
const requests = {
  task: { type: "task_assigned", gubId: "g", taskId: "t" },
  proposal: { type: "proposal_created", gubId: "g", proposalId: "p" },
  answer: { type: "community_answer_created", communityId: "c", askId: "a", answerId: "actor" },
  best: { type: "community_best_answer_selected", communityId: "c", askId: "a", answerId: "actor" },
  join: { type: "community_join_request_created", communityId: "c", requesterUid: "actor" },
  resolved: { type: "community_join_request_resolved", communityId: "c", requesterUid: "actor" },
};
function prepare(kind, docs = fixtures()) {
  if (kind === "best") Object.assign(docs["communities/c/asks/a"], { status: "resolved", bestAnswerId: "actor", bestAnswerAuthorId: "actor", resolvedAt: stamp(), xpAwarded: true });
  if (kind === "resolved") Object.assign(docs["communities/c/joinRequests/actor"], { status: "approved", resolvedBy: "owner", resolvedAt: stamp() });
  return docs;
}
const callers = { best: "asker", resolved: "owner" };
async function validate(kind, docs = prepare(kind), request = requests[kind], caller = callers[kind] ?? "actor") {
  assert.equal(typeof validator.validatePushEvent, "function");
  const firestore = client(docs);
  return { event: await validator.validatePushEvent(request, caller, firestore), calls: firestore.calls };
}

const expected = {
  task: ["task_assigned__g__t", { gubId: "g", taskId: "t" }, { kind: "users", userIds: ["recipient"] }],
  proposal: ["proposal_created__g__p", { gubId: "g", proposalId: "p" }, { kind: "gub_members", gubId: "g", excludeUid: "actor" }],
  answer: ["community_answer_created__c__a__actor", { communityId: "c", askId: "a", answerId: "actor" }, { kind: "users", userIds: ["asker"] }],
  best: ["community_best_answer_selected__c__a__actor", { communityId: "c", askId: "a", answerId: "actor" }, { kind: "users", userIds: ["actor"] }],
  join: ["community_join_request_created__c__actor__2026-09-21T10:00:00.123456000Z", { communityId: "c", requesterUid: "actor" }, { kind: "community_moderators", communityId: "c", ownerId: "owner", excludeUid: "actor" }],
  resolved: ["community_join_request_resolved__c__actor__2026-09-21T10:00:00.123456000Z__approved", { communityId: "c", requesterUid: "actor", status: "approved" }, { kind: "users", userIds: ["actor"] }],
};
for (const kind of Object.keys(requests)) {
  test(`event validator ${kind}: canonical key, routing, copy, source; reads only`, async () => {
    const { event, calls } = await validate(kind);
    assert.equal(event.eventKey, expected[kind][0]);
    assert.equal(event.type, requests[kind].type);
    assert.equal(event.actorId, callers[kind] ?? "actor");
    assert.deepEqual(event.data, expected[kind][1]);
    assert.deepEqual(event.recipientSource, expected[kind][2]);
    assert.ok(event.title.length > 0 && event.title.length <= 100);
    assert.ok(event.body.length > 0 && event.body.length <= 240);
    assert.ok(calls.length <= 10);
    assert.ok(calls.every(({ path }) => !/pushNotifications|devices|pushDeliveryEvents/.test(path)));
  });
  test(`event validator ${kind}: rejects wrong caller, missing profile, deletion state, forged input`, async () => {
    await assert.rejects(validate(kind, prepare(kind), requests[kind], "intruder"), /invalid push event/i);
    for (const change of [
      (docs) => delete docs[`users/${callers[kind] ?? "actor"}`],
      (docs) => { docs[`accountDeletionStates/${callers[kind] ?? "actor"}`] = { phase: "starting" }; },
      (docs) => { docs[kind === "task" || kind === "proposal" ? "gubs/g" : "communities/c"].deletionStatus = "deleting"; },
    ]) {
      const docs = prepare(kind); change(docs);
      await assert.rejects(validate(kind, docs), /invalid push event/i);
    }
    for (const extra of [{ recipients: ["victim"] }, { title: "forged" }, { body: "forged" }, { requestedAt: "old" }]) {
      await assert.rejects(validate(kind, prepare(kind), { ...requests[kind], ...extra }), /invalid push event/i);
    }
  });
}

test("event validator task: rejects stale/completed/archived and mismatched IDs or lost creation authority", async () => {
  for (const patch of [{ status: "completed" }, { archived: true }, { gubId: "other" }, { taskId: "other" }, { creatorId: "other" }]) {
    const docs = fixtures(); Object.assign(docs["gubs/g/tasks/t"], patch);
    await assert.rejects(validate("task", docs), /invalid push event/i);
  }
  const docs = fixtures(); delete docs["gubs/g/members/actor"];
  await assert.rejects(validate("task", docs), /invalid push event/i);
});
test("event validator task: empty and self-assigned tasks have no recipients", async () => {
  for (const assignedUserId of [null, "", "actor"]) {
    const docs = fixtures(); docs["gubs/g/tasks/t"].assignedUserId = assignedUserId;
    assert.deepEqual((await validate("task", docs)).event.recipientSource, { kind: "users", userIds: [] });
  }
});
test("event validator proposal: creation-state checks and bounded member source without enumeration", async () => {
  for (const patch of [{ status: "approved" }, { resultProcessed: true }, { deleted: true }, { deletedAt: stamp() }, { gubId: "other" }, { proposalId: "other" }, { creatorId: "other" }]) {
    const docs = fixtures(); Object.assign(docs["gubs/g/proposals/p"], patch);
    await assert.rejects(validate("proposal", docs), /invalid push event/i);
  }
  const { calls } = await validate("proposal");
  assert.deepEqual(calls.map(({ path }) => path).sort(), ["users/actor", "accountDeletionStates/actor", "gubs/g", "gubs/g/proposals/p", "gubs/g/members/actor"].sort());
});
test("event validator answer: active Ask, exact linkage, author identity, membership and self-exclusion", async () => {
  for (const [path, patch] of [
    ["communities/c/asks/a", { status: "resolved" }], ["communities/c/asks/a", { askId: "other" }],
    ["communities/c/asks/a", { communityId: "other" }], ["communities/c/asks/a/answers/actor", { authorId: "other" }],
    ["communities/c/asks/a/answers/actor", { answerId: "other" }], ["communities/c/asks/a", { moderationHidden: true }],
  ]) {
    const docs = fixtures(); Object.assign(docs[path], patch);
    await assert.rejects(validate("answer", docs), /invalid push event/i);
  }
  const docs = fixtures(); docs["communities/c/asks/a"].authorId = "actor";
  assert.deepEqual((await validate("answer", docs)).event.recipientSource.userIds, []);
  delete docs["communities/c/members/actor"];
  await assert.rejects(validate("answer", docs), /invalid push event/i);
});
test("event validator best: resolved Ask and matching selected answer/author required", async () => {
  for (const patch of [{ status: "active" }, { bestAnswerId: "other" }, { bestAnswerAuthorId: "other" }, { authorId: "actor" }]) {
    const docs = prepare("best"); Object.assign(docs["communities/c/asks/a"], patch);
    await assert.rejects(validate("best", docs), /invalid push event/i);
  }
  const docs = prepare("best"); delete docs["communities/c/asks/a/answers/actor"];
  await assert.rejects(validate("best", docs), /invalid push event/i);
});
test("event validator join: pending approval request, canonical requester and valid cycle required", async () => {
  for (const patch of [{ status: "approved" }, { userId: "other" }, { requestedAt: null }, { requestedAt: "2026-09-21T10:00:00Z" }, { requestedAt: stamp("2026-09-19T00:00:00Z") }, { resolvedBy: "owner" }]) {
    const docs = fixtures(); Object.assign(docs["communities/c/joinRequests/actor"], patch);
    await assert.rejects(validate("join", docs), /invalid push event/i);
  }
  const docs = fixtures(); delete docs["communities/c/joinRequests/actor"].requestedAt;
  await assert.rejects(validate("join", docs), /invalid push event/i);
  docs["communities/c/joinRequests/actor"].requestedAt = stamp(); docs["communities/c"].accessMode = "open";
  await assert.rejects(validate("join", docs), /invalid push event/i);
});
test("event validator join: reused request cycles differing below milliseconds remain distinct", async () => {
  const docs = fixtures(); const first = (await validate("join", docs)).event;
  docs["communities/c/joinRequests/actor"].requestedAt = stamp("2026-09-21T10:00:00.123457Z");
  const next = (await validate("join", docs)).event;
  assert.notEqual(first.eventKey, next.eventKey);
  assert.ok(next.eventKey.endsWith("2026-09-21T10:00:00.123457000Z"));
});
test("event validator resolved: owner or active Platform Admin only; approved/rejected copy distinct", async () => {
  const approved = (await validate("resolved")).event;
  const docs = prepare("resolved"); Object.assign(docs["communities/c/joinRequests/actor"], { status: "rejected", resolvedBy: "admin" });
  const rejected = (await validate("resolved", docs, requests.resolved, "admin")).event;
  assert.notEqual(approved.body, rejected.body);
  assert.ok(rejected.eventKey.endsWith("__rejected"));
  for (const change of [
    (data) => { data["platformAdmins/admin"].active = false; },
    (data) => { delete data["platformAdmins/admin"]; data["communities/c/members/admin"] = { role: "admin" }; },
    (data) => { delete data["users/admin"]; },
    (data) => { data["accountDeletionStates/admin"] = {}; },
    (data) => { data["communities/c/joinRequests/actor"].resolvedBy = "owner"; },
    (data) => { data["communities/c/joinRequests/actor"].status = "pending"; },
    (data) => { data["communities/c/joinRequests/actor"].resolvedAt = stamp("2026-09-20T00:00:00Z"); },
  ]) {
    const changed = structuredClone(docs); change(changed);
    await assert.rejects(validate("resolved", changed, requests.resolved, "admin"), /invalid push event/i);
  }
});
test("event validator rejects unsupported types, unsafe path IDs and missing entities", async () => {
  for (const request of [{ type: "chat_message" }, { ...requests.task, gubId: "../other" }, { ...requests.task, taskId: "x/y/z" }]) {
    await assert.rejects(validate("task", fixtures(), request), /invalid push event/i);
  }
  for (const [kind, path] of [["task", "gubs/g/tasks/t"], ["proposal", "gubs/g/proposals/p"], ["answer", "communities/c/asks/a"], ["join", "communities/c/joinRequests/actor"]]) {
    const docs = fixtures(); delete docs[path]; await assert.rejects(validate(kind, docs), /invalid push event/i);
  }
});
test("event validator key components escape delimiters without conflating entity IDs", async () => {
  const docs = fixtures(); docs["gubs/g/tasks/t__x"] = { ...docs["gubs/g/tasks/t"], taskId: "t__x" };
  const { event } = await validate("task", docs, { ...requests.task, taskId: "t__x" });
  assert.equal(event.eventKey, "task_assigned__g__t%5F%5Fx");
});
