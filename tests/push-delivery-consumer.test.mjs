import assert from "node:assert/strict";
import test from "node:test";
import { decodeDocument } from "../worker/push/firestore-rest.ts";
import { dispatchPushQueueBatch } from "../worker/push/queue-messages.ts";

const delivery = await import("../worker/push/delivery-consumer.ts").catch(() => ({}));
const ROOT = "projects/push-test/databases/(default)/documents/";
const eventKey = "task_assigned__g__t";
const recipientPath = `pushDeliveryEvents/${eventKey}/recipients/recipient`;
const message = { kind: "delivery", eventKey, recipientUid: "recipient" };
const NOW = new Date("2026-09-26T10:00:00Z");

function raw(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(raw) } };
  return { mapValue: { fields: encodeFields(value) } };
}
function encodeFields(fields) { return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, raw(value)])); }

// Fake the external REST boundary; retain real serializers, query construction,
// preconditions, FCM classification, budget accounting, and consumer control flow.
function fixture(deviceCount = 0) {
  const docs = new Map();
  const calls = [];
  const pushes = [];
  const queued = [];
  const failures = [];
  let revision = 0;
  let queueFailure = null;
  let onPush = () => Response.json({ name: "projects/push-test/messages/m" });
  const version = () => new Date(NOW.getTime() + ++revision).toISOString();
  function put(path, fields) { docs.set(path, { name: ROOT + path, fields: encodeFields(fields), updateTime: version() }); }
  function read(path) { return docs.has(path) ? decodeDocument(structuredClone(docs.get(path))).fields : null; }
  function fail(operation, path, after = false) { failures.push({ operation, path, after }); }
  async function fetch(input, init = {}) {
    const url = new URL(input);
    const method = init.method ?? "GET";
    calls.push({ url, method, body: init.body });
    if (url.hostname === "fcm.googleapis.com") {
      const sent = JSON.parse(init.body).message;
      pushes.push(sent);
      return onPush(sent);
    }
    if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "test-oauth", expires_in: 3600, token_type: "Bearer" });
    const path = decodeURIComponent(url.pathname.split("/documents/")[1] ?? "");
    const body = init.body ? JSON.parse(init.body) : null;
    if (url.pathname.endsWith(":runQuery")) {
      const query = body.structuredQuery;
      assert.deepEqual(query.from, [{ collectionId: "devices" }]);
      assert.deepEqual(query.orderBy, [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }]);
      assert.ok(query.limit <= 20);
      const after = query.startAt?.values[0].referenceValue ?? "";
      if (query.startAt) assert.equal(query.startAt.before, false);
      return Response.json([...docs.values()].filter(doc => doc.name.startsWith(ROOT + "users/recipient/devices/") && doc.name > after)
        .sort((a, b) => a.name < b.name ? -1 : 1).slice(0, query.limit).map(document => ({ document })));
    }
    let write;
    let operation;
    let target = path;
    if (url.pathname.endsWith(":commit")) {
      assert.equal(body.writes.length, 1);
      write = body.writes[0];
      target = write.update.name.slice(ROOT.length);
      operation = write.currentDocument?.exists === false ? "create" : "update";
    } else if (method === "PATCH") {
      write = { update: { fields: body.fields }, updateMask: { fieldPaths: url.searchParams.getAll("updateMask.fieldPaths") }, currentDocument: { updateTime: url.searchParams.get("currentDocument.updateTime") } };
      operation = "update";
    } else operation = method === "DELETE" ? "delete" : "read";
    const failureIndex = failures.findIndex(f => f.operation === operation && f.path === target);
    const failure = failureIndex < 0 ? null : failures.splice(failureIndex, 1)[0];
    if (failure && !failure.after) return new Response(null, { status: 503 });
    const existing = docs.get(target);
    if (write) {
      if (write.currentDocument?.exists === false && existing) return new Response(null, { status: 409 });
      if (write.currentDocument?.updateTime && existing?.updateTime !== write.currentDocument.updateTime) return new Response(null, { status: 409 });
      const result = existing ?? { name: ROOT + target, fields: {} };
      for (const key of write.updateMask?.fieldPaths ?? Object.keys(write.update.fields)) result.fields[key] = structuredClone(write.update.fields[key]);
      for (const transform of write.updateTransforms ?? []) {
        assert.equal(transform.setToServerValue, "REQUEST_TIME");
        result.fields[transform.fieldPath] = { timestampValue: NOW.toISOString() };
      }
      result.updateTime = version();
      docs.set(target, result);
      if (failure?.after) throw new Error("ambiguous write private-device-token");
      return url.pathname.endsWith(":commit") ? Response.json({ writeResults: [{ updateTime: result.updateTime }] }) : Response.json(result);
    }
    if (method === "DELETE") {
      assert.ok(url.searchParams.get("currentDocument.updateTime"), "deletes must guard against token refresh");
      if (!existing) return new Response(null, { status: 404 });
      if (url.searchParams.get("currentDocument.updateTime") !== existing.updateTime) return new Response(null, { status: 412 });
      docs.delete(target);
      if (failure?.after) throw new Error("ambiguous device deletion");
      return new Response(null, { status: 200 });
    }
    assert.equal(method, "GET");
    return existing ? Response.json(existing) : new Response(null, { status: 404 });
  }
  put(`pushDeliveryEvents/${eventKey}`, {
    schemaVersion: 1, eventKey, type: "task_assigned", actorId: "actor",
    title: "New task assigned", body: "You have been assigned a task.", data: { gubId: "g", taskId: "t" },
    recipientSource: { kind: "users", userIds: ["recipient"] }, createdAt: NOW,
    fanout: { status: "completed", cursor: null, attempts: 1, completed: true },
  });
  put(recipientPath, { schemaVersion: 1, eventKey, recipientUid: "recipient", status: "enqueued", attempts: 1, enqueuedAt: NOW });
  for (let i = 0; i < deviceCount; i++) {
    const deviceId = `device-${String(i).padStart(3, "0")}`;
    put(`users/recipient/devices/${deviceId}`, { deviceId, token: `private-token-${i}`, platform: i % 2 ? "ios" : "android", updatedAt: NOW });
  }
  const env = { FIREBASE_PROJECT_ID: "push-test", FIREBASE_CLIENT_EMAIL: "test@example.invalid", FIREBASE_PRIVATE_KEY: "unused", PUSH_DELIVERY_QUEUE: {
    async send(body) {
      calls.push({ method: "QUEUE" });
      const failure = queueFailure;
      queueFailure = null;
      if (failure === "before") throw new Error("queue unavailable private-token");
      queued.push(structuredClone(body));
      if (failure === "after") throw new Error("ambiguous queue acceptance private-token");
    },
  } };
  assert.equal(typeof delivery.createDeliveryConsumer, "function");
  const consume = delivery.createDeliveryConsumer({ createFirestoreClient: async () => ({ projectId: "push-test", accessToken: "test-access", fetch }), fetch });
  return { docs, calls, pushes, queued, put, read, fail, env, fetch, consume,
    setPush(fn) { onPush = fn; }, failQueue(after = false) { queueFailure = after ? "after" : "before"; },
    inboxes() { return [...docs.keys()].filter(path => path.includes("/pushNotifications/")); },
  };
}

test("inbox is created before FCM, exactly once, and an existing read:true survives replay", async () => {
  const f = fixture(2);
  f.setPush(() => { assert.equal(f.inboxes().length, 1); return Response.json({ name: "projects/p/messages/m" }); });
  const result = await f.consume(message, f.env);
  assert.equal(result.completed, true);
  assert.equal(f.pushes.length, 2);
  assert.equal(result.externalSubrequests, f.calls.length);
  const path = f.inboxes()[0];
  const inbox = f.read(path);
  assert.equal(inbox.id, path.split("/").at(-1));
  assert.equal(inbox.id, f.pushes[0].data.notificationId);
  assert.equal(inbox.read, false);
  assert.equal(inbox.actorId, "actor");
  assert.deepEqual(inbox.data, { gubId: "g", taskId: "t" });
  assert.ok(inbox.createdAt instanceof Date);
  f.put(path, { ...inbox, read: true });
  // Reconcile an old enqueued snapshot without touching inbox contents.
  f.put(recipientPath, { ...f.read(recipientPath), status: "enqueued", deviceCursor: null });
  await f.consume(message, f.env);
  assert.equal(f.inboxes().length, 1);
  assert.equal(f.read(path).read, true);
  const sentBefore = f.pushes.length;
  await f.consume(message, f.env);
  assert.equal(f.pushes.length, sentBefore);
});

test("device keyset pages are bounded, persisted, deterministic, and complete only at terminal page", async () => {
  const f = fixture(45);
  let next = message;
  let loops = 0;
  do {
    const before = f.calls.length;
    const pushesBefore = f.pushes.length;
    const result = await f.consume(next, f.env);
    assert.equal(result.externalSubrequests, f.calls.length - before);
    assert.ok(result.externalSubrequests <= 40);
    assert.ok(f.pushes.length - pushesBefore <= 20);
    if (result.completed) break;
    assert.notEqual(f.read(recipientPath).status, "completed");
    next = f.queued.shift();
    assert.equal(next.deviceCursor, f.read(recipientPath).deviceCursor);
    assert.ok(++loops < 10);
  } while (true);
  assert.equal(f.pushes.length, 45);
  assert.equal(new Set(f.pushes.map(p => p.token)).size, 45);
  assert.equal(f.read(recipientPath).status, "completed");
  assert.ok(f.read(recipientPath).completedAt instanceof Date);
});

test("all-invalid devices respect budget, delete only matching revisions, and do not skip after deletion", async () => {
  const f = fixture(41);
  f.setPush(() => Response.json({ error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, { status: 404 }));
  let next = message;
  for (let i = 0; i < 10; i++) {
    const before = f.calls.length;
    const result = await f.consume(next, f.env);
    assert.equal(result.externalSubrequests, f.calls.length - before);
    assert.ok(result.externalSubrequests <= 39);
    assert.ok(result.devicesProcessed <= 20);
    if (result.completed) break;
    next = f.queued.shift();
  }
  assert.equal(f.read(recipientPath).status, "completed");
  assert.equal(f.pushes.length, 41);
  assert.equal([...f.docs.keys()].filter(p => p.includes("/devices/")).length, 0);
});

test("transient or ambiguous FCM errors retain registrations and never complete prematurely", async () => {
  const f = fixture(2);
  f.setPush(() => { throw new Error("SECRET-full-token"); });
  await assert.rejects(f.consume(message, f.env), error => !String(error).includes("SECRET"));
  assert.notEqual(f.read(recipientPath).status, "completed");
  assert.equal([...f.docs.keys()].filter(p => p.includes("/devices/")).length, 2);
  f.setPush(() => Response.json({ name: "projects/p/messages/m" }));
  assert.equal((await f.consume(message, f.env)).completed, true);
  assert.equal(f.inboxes().length, 1);
});

test("invalid-token cleanup cannot delete a refreshed installation", async () => {
  const f = fixture(1);
  f.setPush(() => {
    f.put("users/recipient/devices/device-000", { deviceId: "device-000", token: "fresh-token", platform: "android", updatedAt: NOW });
    return Response.json({ error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, { status: 404 });
  });
  await f.consume(message, f.env);
  assert.equal(f.read("users/recipient/devices/device-000").token, "fresh-token");
});

test("cursor persisted before failed Queue acceptance is repaired by stale delivery", async () => {
  const f = fixture(25);
  f.failQueue();
  await assert.rejects(f.consume(message, f.env));
  const cursor = f.read(recipientPath).deviceCursor;
  assert.ok(cursor);
  assert.notEqual(f.read(recipientPath).status, "completed");
  const sent = f.pushes.length;
  const stale = await f.consume(message, f.env);
  assert.equal(stale.stale, true);
  assert.equal(f.pushes.length, sent);
  assert.deepEqual(f.queued[0], { ...message, deviceCursor: cursor });
  await f.consume(f.queued.shift(), f.env);
  assert.equal(f.read(recipientPath).status, "completed");
});

for (const after of [false, true]) test(`recipient checkpoint failure (${after ? "after apply" : "before apply"}) recovers without duplicate inbox`, async () => {
  const f = fixture(21);
  f.fail("update", recipientPath, after);
  await assert.rejects(f.consume(message, f.env));
  assert.equal(f.inboxes().length, 1);
  assert.notEqual(f.read(recipientPath).status, "completed");
  await f.consume(message, f.env);
  while (f.queued.length) await f.consume(f.queued.shift(), f.env);
  assert.equal(f.inboxes().length, 1);
  assert.equal(f.read(recipientPath).status, "completed");
});

test("ambiguous inbox create replays via read without overwriting read state", async () => {
  const f = fixture(1);
  const fcm = await import("../worker/push/fcm-client.ts");
  const payload = await fcm.buildFcmMessage(f.read(`pushDeliveryEvents/${eventKey}`), "recipient", "token");
  const path = `users/recipient/pushNotifications/${payload.data.notificationId}`;
  f.fail("create", path, true);
  await assert.rejects(f.consume(message, f.env));
  assert.equal(f.pushes.length, 0);
  f.put(path, { ...f.read(path), read: true });
  await f.consume(message, f.env);
  assert.equal(f.read(path).read, true);
});

test("concurrent deliveries use CAS so stale work cannot regress a terminal recipient", async () => {
  const f = fixture(1);
  const outcomes = await Promise.allSettled([f.consume(message, f.env), f.consume(message, f.env)]);
  assert.ok(outcomes.some(o => o.status === "fulfilled"));
  assert.equal(f.inboxes().length, 1);
  assert.equal(f.read(recipientPath).status, "completed");
  assert.ok(f.pushes.length <= 2, "FCM remains explicitly best effort");
});

test("untrusted plan/device mismatches cannot create arbitrary inboxes or send tokens", async () => {
  for (const mutation of [
    f => f.put(`pushDeliveryEvents/${eventKey}`, { ...f.read(`pushDeliveryEvents/${eventKey}`), type: "chat_message" }),
    f => f.put(recipientPath, { ...f.read(recipientPath), recipientUid: "someone-else" }),
    f => f.docs.delete(recipientPath),
  ]) {
    const f = fixture(1); mutation(f);
    await assert.rejects(f.consume(message, f.env));
    assert.equal(f.inboxes().length, 0);
    assert.equal(f.pushes.length, 0);
  }
});

test("cold OAuth, REST, FCM, deletes and Queue calls all consume the same request allowance", async () => {
  const f = fixture(30);
  f.setPush(() => Response.json({ error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, { status: 404 }));
  const consume = delivery.createDeliveryConsumer({ fetch: f.fetch, crypto: { subtle: { importKey: async () => ({}), sign: async () => new Uint8Array([1]).buffer } } });
  const env = { ...f.env, FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nAQ==\n-----END PRIVATE KEY-----" };
  const result = await consume(message, env, 27);
  assert.equal(result.externalSubrequests, f.calls.length);
  assert.ok(result.externalSubrequests <= 27);
  assert.equal(f.calls.filter(call => call.url?.hostname === "oauth2.googleapis.com").length, 1);
  assert.equal(result.completed, false);
});

test("mixed Queue batches dispatch one message and byte-bound defer both types under shared 40-call budget", async () => {
  const acks = []; const retries = []; const deferred = []; const consumed = [];
  const bodies = Array.from({ length: 100 }, (_, i) => i % 2 ? { kind: "fanout", eventKey: `event-${i}`, cursor: "😀".repeat(2048) } : { ...message, eventKey: `event-${i}`, deviceCursor: "😀".repeat(2048) });
  const defer = async (messages) => {
    const bytes = 1024 + messages.reduce((sum, body) => sum + Buffer.byteLength(JSON.stringify({ body, contentType: "json" })) + 128, 0);
    assert.ok(bytes <= 240 * 1024);
    deferred.push(...messages);
  };
  const result = await dispatchPushQueueBatch({ messages: bodies.map((body, i) => ({ body, ack: () => acks.push(i), retry: () => retries.push(i) })) },
    async (body, maximum) => { consumed.push(body); return { externalSubrequests: maximum }; }, defer,
    { consume: async (body, maximum) => { consumed.push(body); return { externalSubrequests: maximum }; }, defer });
  assert.deepEqual(consumed, [bodies[0]]);
  assert.equal(deferred.length, 99);
  assert.equal(acks.length, 100);
  assert.equal(retries.length, 0);
  assert.ok(result.externalSubrequests <= 40);
});

test("empty device sets complete, but a full 20-device page needs a terminal continuation", async () => {
  const empty = fixture();
  assert.equal((await empty.consume(message, empty.env)).completed, true);
  assert.equal(empty.inboxes().length, 1);
  assert.equal(empty.pushes.length, 0);
  const full = fixture(20);
  const first = await full.consume(message, full.env);
  assert.equal(first.devicesProcessed, 20);
  assert.equal(first.completed, false);
  const second = await full.consume(full.queued.shift(), full.env);
  assert.equal(second.completed, true);
  assert.equal(second.devicesProcessed, 0);
  assert.equal(full.pushes.length, 20);
});

test("accepted-but-ambiguous continuation may duplicate Queue work but never inboxes or terminal sends", async () => {
  const f = fixture(21);
  f.failQueue(true);
  await assert.rejects(f.consume(message, f.env));
  assert.equal(f.queued.length, 1);
  await f.consume(message, f.env);
  assert.equal(f.queued.length, 2);
  assert.deepEqual(f.queued[0], f.queued[1]);
  await f.consume(f.queued.shift(), f.env);
  const sent = f.pushes.length;
  await f.consume(f.queued.shift(), f.env);
  assert.equal(f.pushes.length, sent);
  assert.equal(f.pushes.length, 21);
  assert.equal(f.inboxes().length, 1);
});

for (const after of [false, true]) test(`invalid-token deletion failure (${after ? "after apply" : "before apply"}) remains recoverable`, async () => {
  const f = fixture(2);
  f.setPush(() => Response.json({ error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, { status: 404 }));
  f.fail("delete", "users/recipient/devices/device-000", after);
  await assert.rejects(f.consume(message, f.env));
  assert.notEqual(f.read(recipientPath).status, "completed");
  await f.consume(message, f.env);
  assert.equal(f.read(recipientPath).status, "completed");
  assert.equal([...f.docs.keys()].filter(path => path.includes("/devices/")).length, 0);
  assert.equal(f.inboxes().length, 1);
});

test("ambiguous terminal checkpoint does not send again on replay", async () => {
  const f = fixture(1);
  f.fail("update", recipientPath, true);
  await assert.rejects(f.consume(message, f.env));
  assert.equal(f.read(recipientPath).status, "completed");
  await f.consume(message, f.env);
  assert.equal(f.pushes.length, 1);
});

test("payload/auth/quota/server errors retain device docs and stay retryable through DELIVERY", async () => {
  for (const [status, code] of [[400, "INVALID_ARGUMENT"], [403, "SENDER_ID_MISMATCH"], [401, "THIRD_PARTY_AUTH_ERROR"], [429, "QUOTA_EXCEEDED"], [500, "INTERNAL"], [503, "UNAVAILABLE"], [404, "NOT_FOUND"]]) {
    const f = fixture(1);
    f.setPush(() => Response.json({ error: { message: "SECRET-full-token", details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: code }] } }, { status }));
    await assert.rejects(f.consume(message, f.env), { message: "Unable to process push delivery" });
    assert.ok(f.read("users/recipient/devices/device-000"));
    assert.equal(f.calls.filter(call => call.method === "DELETE").length, 0);
    assert.notEqual(f.read(recipientPath).status, "completed");
    assert.equal(f.inboxes().length, 1);
  }
});

test("byte-heavy mixed deferrals and real cold delivery share a measured invocation budget", async t => {
  const f = fixture(30);
  f.setPush(() => Response.json({ error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, { status: 404 }));
  const consume = delivery.createDeliveryConsumer({ fetch: f.fetch, crypto: { subtle: { importKey: async () => ({}), sign: async () => new Uint8Array([1]).buffer } } });
  const env = { ...f.env, FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nAQ==\n-----END PRIVATE KEY-----" };
  const bodies = [message, ...Array.from({ length: 99 }, (_, i) => i % 2
    ? { kind: "fanout", eventKey: `event-${i}`, cursor: "\u001c".repeat(4096) }
    : { ...message, eventKey: `event-${i}`, deviceCursor: "\u001c".repeat(4096) })];
  let deferrals = 0;
  let acked = 0;
  const defer = async messages => {
    deferrals += 1;
    assert.ok(1024 + messages.reduce((sum, body) => sum + Buffer.byteLength(JSON.stringify({ body, contentType: "json" })) + 128, 0) <= 240 * 1024);
  };
  const result = await dispatchPushQueueBatch({ messages: bodies.map(body => ({ body, ack: () => { acked += 1; }, retry: () => assert.fail("valid jobs must not consume retry allowance") })) },
    async () => assert.fail("only one delivery should run"), defer,
    { consume: (body, maximum) => consume(body, env, maximum), defer });
  assert.equal(result.externalSubrequests, f.calls.length + deferrals);
  assert.ok(result.externalSubrequests <= 40);
  assert.equal(acked, 100);
  assert.equal(f.queued.length, 1);
  assert.notEqual(f.read(recipientPath).status, "completed");
  t.diagnostic(`Cold DELIVERY + mixed deferrals: ${result.externalSubrequests} actual calls; ${deferrals} byte-bounded deferrals; ${f.pushes.length} invalid tokens cleaned`);
});

test("Worker queue entry point performs DELIVERY and defers each kind to its own binding", async () => {
  const { registerHooks } = await import("node:module");
  const { generateKeyPairSync } = await import("node:crypto");
  const hook = registerHooks({ resolve(specifier, context, next) {
    const sources = {
      "vinext/server/image-optimization": "export const DEFAULT_DEVICE_SIZES=[]; export const DEFAULT_IMAGE_SIZES=[]; export function handleImageOptimization(){}",
      "vinext/server/app-router-entry": "export default {fetch(){throw new Error('not used')}}",
    };
    return sources[specifier] ? { url: `data:text/javascript,${encodeURIComponent(sources[specifier])}`, shortCircuit: true } : next(specifier, context);
  } });
  const originalFetch = globalThis.fetch;
  try {
    const { default: worker } = await import("../worker/index.ts");
    const f = fixture(1);
    globalThis.fetch = f.fetch;
    // Ephemeral, fake-only key: never persisted, logged, or sent to a real service.
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const fanouts = []; const deliveries = []; const outcomes = [];
    const env = { ...f.env, FIREBASE_PRIVATE_KEY: privateKey,
      PUSH_FANOUT_QUEUE: { async sendBatch(items) { fanouts.push(...items); } },
      PUSH_DELIVERY_QUEUE: { ...f.env.PUSH_DELIVERY_QUEUE, async sendBatch(items) { deliveries.push(...items); } },
    };
    const bodies = [message, { kind: "fanout", eventKey: "other-event" }, { ...message, recipientUid: "other-recipient" }];
    await worker.queue({ messages: bodies.map((body, index) => ({ body, ack() { outcomes[index] = "ack"; }, retry() { outcomes[index] = "retry"; } })) }, env);
    assert.deepEqual(outcomes, ["ack", "ack", "ack"]);
    assert.equal(f.pushes.length, 1);
    assert.equal(f.inboxes().length, 1);
    assert.equal(f.read(recipientPath).status, "completed");
    assert.deepEqual(fanouts, [{ body: bodies[1] }]);
    assert.deepEqual(deliveries, [{ body: bodies[2] }]);
    assert.ok(f.calls.length + 2 <= 40);
  } finally {
    globalThis.fetch = originalFetch;
    hook.deregister();
  }
});
