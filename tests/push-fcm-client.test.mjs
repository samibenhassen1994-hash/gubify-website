import assert from "node:assert/strict";
import test from "node:test";

const fcm = await import("../worker/push/fcm-client.ts").catch(() => ({}));
const event = {
  eventKey: "task_assigned__g__t", type: "task_assigned", actorId: "actor",
  title: "New task assigned", body: "You have been assigned a task.", data: { gubId: "g", taskId: "t" },
};

test("FCM contains authoritative notification copy, bounded routing, and stable platform collapse identifiers", async () => {
  assert.equal(typeof fcm.buildFcmMessage, "function");
  const message = await fcm.buildFcmMessage(event, "recipient", "private-device-token");
  assert.deepEqual(message.notification, { title: event.title, body: event.body });
  assert.deepEqual(Object.keys(message.data).sort(), ["eventKey", "gubId", "notificationId", "taskId", "type"]);
  assert.equal(message.data.eventKey, "task_assigned__g__t");
  assert.equal(message.data.type, "task_assigned");
  assert.match(message.data.notificationId, /^[a-f0-9]{64}$/);
  assert.equal(message.android.notification.channel_id, "gubify_global_notifications");
  assert.equal(message.android.notification.channel_id, fcm.GLOBAL_PUSH_ANDROID_CHANNEL_ID);
  assert.equal(message.android.notification.tag, message.android.collapse_key);
  assert.equal(message.apns.headers["apns-collapse-id"], message.android.collapse_key);
  assert.ok(Buffer.byteLength(message.apns.headers["apns-collapse-id"]) <= 64);
  const duplicate = await fcm.buildFcmMessage(event, "recipient", "refreshed-token");
  assert.equal(duplicate.data.notificationId, message.data.notificationId);
  assert.equal(duplicate.android.collapse_key, message.android.collapse_key);
  const other = await fcm.buildFcmMessage(event, "other-recipient", "token");
  assert.notEqual(other.data.notificationId, message.data.notificationId);
  assert.equal(other.android.collapse_key, message.android.collapse_key);
});

test("only six event routing schemas and approved/rejected outcomes are accepted", async () => {
  assert.equal(typeof fcm.buildFcmMessage, "function");
  const routes = [
    ["task_assigned", { gubId: "g", taskId: "t" }],
    ["proposal_created", { gubId: "g", proposalId: "p" }],
    ["community_answer_created", { communityId: "c", askId: "a", answerId: "u" }],
    ["community_best_answer_selected", { communityId: "c", askId: "a", answerId: "u" }],
    ["community_join_request_created", { communityId: "c", requesterUid: "u" }],
    ["community_join_request_resolved", { communityId: "c", requesterUid: "u", status: "approved" }],
    ["community_join_request_resolved", { communityId: "c", requesterUid: "u", status: "rejected" }],
  ];
  for (const [type, data] of routes) {
    const message = await fcm.buildFcmMessage({ ...event, type, data }, "recipient", "token");
    assert.deepEqual(message.data, { ...data, notificationId: message.data.notificationId, eventKey: event.eventKey, type });
    assert.ok(Object.values(message.data).every(value => typeof value === "string"));
  }
  for (const change of [
    { type: "chat_message" }, { data: { ...event.data, secret: "leak" } },
    { data: { gubId: "g", taskId: 42 } }, { data: { gubId: "g", taskId: "a".repeat(257) } },
    { data: { gubId: "g" } }, { title: "x".repeat(121) }, { body: "x".repeat(501) },
    { type: "community_join_request_resolved", data: { communityId: "c", requesterUid: "u", status: "pending" } },
    { eventKey: "x".repeat(1501) },
  ]) await assert.rejects(fcm.buildFcmMessage({ ...event, ...change }, "recipient", "token"), /Invalid push payload/);
});

function failure(status, errorCode, extra = []) {
  return Response.json({ error: { status: "SECRET-REMOTE-MESSAGE", message: "private-device-token", details: [
    ...(errorCode ? [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }] : []), ...extra,
  ] } }, { status });
}

test("FCM v1 sends one authenticated request and never exposes upstream secrets", async () => {
  assert.equal(typeof fcm.sendFcmMessage, "function");
  const message = await fcm.buildFcmMessage(event, "recipient", "private-device-token");
  const calls = [];
  const result = await fcm.sendFcmMessage({ projectId: "project", accessToken: "private-access-token", fetch: async (url, init) => {
    calls.push({ url, init });
    return Response.json({ name: "projects/project/messages/1" });
  } }, message);
  assert.equal(result, "sent");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://fcm.googleapis.com/v1/projects/project/messages:send");
  assert.equal(new Headers(calls[0].init.headers).get("Authorization"), "Bearer private-access-token");
  assert.deepEqual(JSON.parse(calls[0].init.body), { message });
});

test("permanent taxonomy requires unambiguous token evidence; other failures are retryable", async () => {
  assert.equal(typeof fcm.sendFcmMessage, "function");
  const message = await fcm.buildFcmMessage(event, "recipient", "private-device-token");
  const cases = [
    [404, "UNREGISTERED", [], "invalid_token"],
    [400, "INVALID_ARGUMENT", [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "message.token", description: "invalid registration" }] }], "invalid_token"],
    [400, "INVALID_ARGUMENT", [], "retryable"],
    [400, "INVALID_ARGUMENT", [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "message.data", description: "invalid payload" }] }], "retryable"],
    [404, undefined, [], "retryable"], [403, "SENDER_ID_MISMATCH", [], "retryable"],
    [401, "THIRD_PARTY_AUTH_ERROR", [], "retryable"], [429, "QUOTA_EXCEEDED", [], "retryable"],
    [500, "INTERNAL", [], "retryable"], [503, "UNAVAILABLE", [], "retryable"],
    [503, "UNREGISTERED", [], "retryable"],
    [404, "UNREGISTERED", [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "INTERNAL" }], "retryable"],
    [400, "INVALID_ARGUMENT", [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "message.token" }, { field: "message.data" }] }], "retryable"],
  ];
  for (const [status, code, extra, expected] of cases) {
    assert.equal(await fcm.sendFcmMessage({ projectId: "p", accessToken: "a", fetch: async () => failure(status, code, extra) }, message), expected);
  }
  for (const fetch of [async () => { throw new Error("private-device-token"); }, async () => new Response("private-device-token", { status: 500 }), async () => Response.json({})]) {
    assert.equal(await fcm.sendFcmMessage({ projectId: "p", accessToken: "a", fetch }, message), "retryable");
  }
});

test("payload byte ceiling accounts for UTF-8, and event hashes cannot collide by truncation", async () => {
  const long = { ...event, eventKey: "x".repeat(1499) + "a" };
  const first = await fcm.buildFcmMessage(long, "recipient", "token");
  const second = await fcm.buildFcmMessage({ ...long, eventKey: "x".repeat(1499) + "b" }, "recipient", "token");
  assert.notEqual(first.android.collapse_key, second.android.collapse_key);
  assert.notEqual(first.data.notificationId, second.data.notificationId);
  assert.equal(first.android.collapse_key.length, 64);
  await assert.rejects(fcm.buildFcmMessage({ ...event, eventKey: "x".repeat(1500), body: "漢".repeat(500), data: { gubId: "漢".repeat(256), taskId: "漢".repeat(256) } }, "recipient", "token"), /Invalid push payload/);
});

test("FCM never logs token-bearing request, response, or network exception text", async () => {
  const methods = ["log", "error", "warn", "info", "debug"];
  const originals = Object.fromEntries(methods.map(method => [method, console[method]]));
  const logs = [];
  try {
    for (const method of methods) console[method] = (...values) => logs.push(values);
    const message = await fcm.buildFcmMessage(event, "recipient", "SECRET-device");
    for (const fetch of [async () => { throw new Error("SECRET-device SECRET-access"); }, async () => failure(400, "INVALID_ARGUMENT")]) {
      assert.equal(await fcm.sendFcmMessage({ projectId: "p", accessToken: "SECRET-access", fetch }, message), "retryable");
    }
    assert.deepEqual(logs, []);
  } finally {
    for (const method of methods) console[method] = originals[method];
  }
});
