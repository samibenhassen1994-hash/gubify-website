import assert from "node:assert/strict";
import test from "node:test";
import { createPushEventRequestHandler } from "../worker/push/handler.ts";
const storeModule = await import("../worker/push/event-plan-store.ts").catch(() => ({}));
const root = "projects/push-test/databases/(default)/documents/";
const event = {
  eventKey: "task_assigned__g__t", type: "task_assigned", actorId: "actor",
  title: "New task assigned", body: "You have been assigned a task.",
  data: { gubId: "g", taskId: "t" }, recipientSource: { kind: "users", userIds: ["recipient"] },
};
function memoryFirestore() {
  const docs = new Map(); const writes = []; const reads = [];
  let failStatus;
  const firestore = {
    projectId: "push-test", accessToken: "mock-token",
    async fetch(input, init) {
      const url = new URL(input);
      if (init?.method === "POST") {
        assert.ok(url.pathname.endsWith("/documents:commit"));
        const { writes: [write] } = JSON.parse(init.body); writes.push(write);
        if (failStatus) return new Response(null, { status: failStatus });
        if (write.currentDocument?.exists === true) {
          const saved = docs.get(write.update.name);
          assert.ok(saved);
          for (const fieldPath of write.updateMask.fieldPaths) {
            const [parent, child] = fieldPath.split(".");
            saved.fields[parent].mapValue.fields[child] =
              structuredClone(write.update.fields[parent].mapValue.fields[child]);
          }
          for (const transform of write.updateTransforms) {
            assert.equal(transform.setToServerValue, "REQUEST_TIME");
            saved.fields[transform.fieldPath] = { timestampValue: "2026-09-21T10:00:00.123456Z" };
          }
          return Response.json({ writeResults: [{}], commitTime: "2026-09-21T10:00:00Z" });
        }
        assert.deepEqual(write.currentDocument, { exists: false });
        if (docs.has(write.update.name)) return new Response(null, { status: 409 });
        assert.ok(write.update.name.startsWith(root + "pushDeliveryEvents/"));
        const saved = structuredClone(write.update);
        for (const transform of write.updateTransforms) {
          assert.equal(transform.setToServerValue, "REQUEST_TIME");
          saved.fields[transform.fieldPath] = { timestampValue: "2026-09-21T10:00:00.123456Z" };
        }
        docs.set(saved.name, saved);
        return Response.json({ writeResults: [{}], commitTime: "2026-09-21T10:00:00Z" });
      }
      assert.equal(init?.method ?? "GET", "GET");
      const name = root + decodeURIComponent(url.pathname.split("/documents/")[1]); reads.push(name);
      return docs.has(name) ? Response.json(docs.get(name)) : new Response(null, { status: 404 });
    },
  };
  return { firestore, docs, writes, reads, failWith(status) { failStatus = status; } };
}
function store(firestore) {
  assert.equal(typeof storeModule.createEventPlanStore, "function");
  return storeModule.createEventPlanStore(firestore);
}
test("event plan create-or-read returns one canonical plan with pending fanout and server timestamp", async () => {
  const memory = memoryFirestore(); const plans = store(memory.firestore);
  const [first, second] = await Promise.all([plans.ensureEventPlan(event), plans.ensureEventPlan(event)]);
  assert.deepEqual(first, second);
  assert.equal(first.eventKey, "task_assigned__g__t");
  assert.equal(first.schemaVersion, 1);
  assert.deepEqual(first.data, { gubId: "g", taskId: "t" });
  assert.deepEqual(first.fanout, { status: "pending", cursor: null, attempts: 0, completed: false });
  assert.ok(first.createdAt instanceof Date);
  assert.equal(memory.docs.size, 1);
  assert.equal(memory.writes.length, 2);
  assert.ok(memory.reads.every((name) => name === root + "pushDeliveryEvents/task_assigned__g__t"));
});
test("event plan retries preserve progress and never reset stored fanout state", async () => {
  const memory = memoryFirestore(); const plans = store(memory.firestore);
  await plans.ensureEventPlan(event);
  const saved = memory.docs.values().next().value;
  saved.fields.fanout.mapValue.fields.status = { stringValue: "enqueued" };
  saved.fields.fanout.mapValue.fields.attempts = { integerValue: "2" };
  saved.fields.fanout.mapValue.fields.cursor = { stringValue: "next-page" };
  const retry = await plans.ensureEventPlan(event);
  assert.equal(retry.fanout.status, "enqueued");
  assert.equal(retry.fanout.attempts, 2);
  assert.equal(retry.fanout.cursor, "next-page");
});
test("event plan existing canonical mismatches fail closed without overwrites", async () => {
  for (const field of ["eventKey", "type", "actorId", "title", "body", "data", "recipientSource", "schemaVersion"]) {
    const memory = memoryFirestore(); const plans = store(memory.firestore);
    await plans.ensureEventPlan(event);
    const saved = memory.docs.values().next().value;
    saved.fields[field] = { stringValue: "forged" };
    await assert.rejects(plans.ensureEventPlan(event), /event plan mismatch/i);
    assert.deepEqual(saved.fields[field], { stringValue: "forged" });
  }
});
test("event plan storage outages do not become successful duplicate submissions", async () => {
  const memory = memoryFirestore(); const plans = store(memory.firestore);
  for (const status of [403, 429, 500, 503]) {
    memory.failWith(status);
    await assert.rejects(plans.ensureEventPlan(event), /firestore request failed/i);
  }
  memory.failWith(409);
  await assert.rejects(plans.ensureEventPlan(event), /event plan mismatch/i);
});
test("event plan HTTP integration persists then enqueues FANOUT without inbox or DELIVERY work", async () => {
  const memory = memoryFirestore();
  const fields = (object) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, typeof value === "boolean" ? { booleanValue: value } : { stringValue: value }]));
  for (const [path, data] of Object.entries({
    "users/actor": { displayName: "Actor" }, "gubs/g": { ownerId: "owner" },
    "gubs/g/members/actor": { userId: "actor" },
    "gubs/g/tasks/t": { gubId: "g", taskId: "t", creatorId: "actor", assignedUserId: "recipient", status: "active", archived: false },
  })) memory.docs.set(root + path, { name: root + path, fields: fields(data) });
  const queued = [];
  const handle = createPushEventRequestHandler({
    async verifyFirebaseIdToken() { return { uid: "actor", claims: {} }; },
    async createFirestoreClient() { return memory.firestore; },
  });
  const response = await handle(new Request("https://gubify.com/api/push/events", {
    method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify({ type: "task_assigned", gubId: "g", taskId: "t" }),
  }), {
    FIREBASE_PROJECT_ID: "push-test", PUSH_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } },
    PUSH_FANOUT_QUEUE: { async send(message) { queued.push(message); } },
    PUSH_DELIVERY_QUEUE: { async send() { throw new Error("HTTP must not enqueue DELIVERY"); } },
  }, {});
  assert.equal(memory.writes.length, 2);
  assert.deepEqual(queued, [{ kind: "fanout", eventKey: "task_assigned__g__t" }]);
  assert.equal(response.status, 202);
});
