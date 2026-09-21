import assert from "node:assert/strict";
import test from "node:test";

const fanoutModule = await import("../worker/push/fanout-consumer.ts").catch(() => ({}));
const queueModule = await import("../worker/push/queue-messages.ts").catch(() => ({}));
const { createPushEventRequestHandler } = await import("../worker/push/handler.ts");
const { decodeDocument } = await import("../worker/push/firestore-rest.ts");

const PROJECT_ID = "push-test";
const ROOT = `projects/${PROJECT_ID}/databases/(default)/documents/`;
const NOW = new Date("2026-09-21T12:00:00.000Z");

function rawValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isSafeInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(rawValue) } };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rawValue(item)])),
    },
  };
}

function rawFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, rawValue(value)]));
}

function getNested(fields, path) {
  const parts = path.split(".");
  let current = fields;
  for (let index = 0; index < parts.length; index += 1) {
    const value = current?.[parts[index]];
    if (index === parts.length - 1) return value;
    current = value?.mapValue?.fields;
  }
  return undefined;
}

function setNested(fields, path, value) {
  const parts = path.split(".");
  let current = fields;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    current[part] ??= { mapValue: { fields: {} } };
    current = current[part].mapValue.fields;
  }
  current[parts.at(-1)] = structuredClone(value);
}

function memoryFirestore() {
  const documents = new Map();
  const calls = [];
  const failures = [];
  let revision = 0;

  const updateTime = () => {
    revision += 1;
    return `2026-09-21T12:00:${String(revision % 60).padStart(2, "0")}.000Z`;
  };

  function put(path, fields) {
    documents.set(path, {
      name: ROOT + path,
      fields: rawFields(fields),
      createTime: "2026-09-21T10:00:00.000Z",
      updateTime: updateTime(),
    });
  }

  function decoded(path) {
    const document = documents.get(path);
    return document ? decodeDocument(structuredClone(document)) : null;
  }

  function failNext({ operation, path, afterApply = false }) {
    failures.push({ operation, path, afterApply });
  }

  function matchingFailure(operation, path) {
    const index = failures.findIndex((failure) => failure.operation === operation && failure.path === path);
    return index < 0 ? undefined : failures.splice(index, 1)[0];
  }

  function applyWrite(write) {
    const resource = write.update?.name ?? write.transform?.document;
    const path = resource.slice(ROOT.length);
    const existing = documents.get(path);
    if (write.currentDocument?.exists === false && existing) return { conflict: true, path };
    if (write.currentDocument?.exists === true && !existing) return { missing: true, path };
    if (write.currentDocument?.updateTime && existing?.updateTime !== write.currentDocument.updateTime) {
      return { conflict: true, path };
    }

    const document = existing ?? {
      name: ROOT + path,
      fields: {},
      createTime: "2026-09-21T12:00:00.000Z",
    };
    if (write.update) {
      const masks = write.updateMask?.fieldPaths;
      if (masks) {
        for (const mask of masks) {
          setNested(document.fields, mask, getNested(write.update.fields, mask));
        }
      } else {
        document.fields = structuredClone(write.update.fields);
      }
    }
    for (const transform of write.updateTransforms ?? write.transform?.fieldTransforms ?? []) {
      assert.equal(transform.setToServerValue, "REQUEST_TIME");
      setNested(document.fields, transform.fieldPath, { timestampValue: NOW.toISOString() });
    }
    document.updateTime = updateTime();
    documents.set(path, document);
    return { path };
  }

  const client = {
    projectId: PROJECT_ID,
    accessToken: "test-token",
    async fetch(input, init = {}) {
      const url = new URL(input);
      const method = init.method ?? "GET";
      calls.push({ method, url, body: init.body });

      if (method === "POST" && url.pathname.endsWith("/documents:commit")) {
        const body = JSON.parse(init.body);
        assert.equal(body.writes.length, 1);
        const previewPath = (body.writes[0].update?.name ?? body.writes[0].transform?.document).slice(ROOT.length);
        const operation = body.writes[0].currentDocument?.exists === false ? "create" : "update";
        const failure = matchingFailure(operation, previewPath);
        if (failure && !failure.afterApply) return new Response(null, { status: 503 });
        const result = applyWrite(body.writes[0]);
        if (result.conflict) return new Response(null, { status: 409 });
        if (result.missing) return new Response(null, { status: 404 });
        if (failure?.afterApply) throw new Error("ambiguous write");
        return Response.json({
          writeResults: [{ updateTime: documents.get(result.path).updateTime }],
          commitTime: documents.get(result.path).updateTime,
        });
      }

      const marker = "/documents/";
      const encodedPath = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
      const path = encodedPath.split("/").map(decodeURIComponent).join("/");

      if (method === "PATCH") {
        const failure = matchingFailure("update", path);
        if (failure && !failure.afterApply) return new Response(null, { status: 503 });
        const existing = documents.get(path);
        if (!existing) return new Response(null, { status: 404 });
        const expectedUpdateTime = url.searchParams.get("currentDocument.updateTime");
        if (expectedUpdateTime && expectedUpdateTime !== existing.updateTime) {
          return new Response(null, { status: 409 });
        }
        const update = JSON.parse(init.body);
        for (const mask of url.searchParams.getAll("updateMask.fieldPaths")) {
          setNested(existing.fields, mask, getNested(update.fields, mask));
        }
        existing.updateTime = updateTime();
        if (failure?.afterApply) throw new Error("ambiguous write");
        return Response.json(structuredClone(existing));
      }

      assert.equal(method, "GET");
      if (path.split("/").length % 2 === 0) {
        const document = documents.get(path);
        return document ? Response.json(structuredClone(document)) : new Response(null, { status: 404 });
      }

      const prefix = `${path}/`;
      const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
      const pageToken = url.searchParams.get("pageToken");
      const offset = pageToken ? Number(pageToken.replace("offset:", "")) : 0;
      const matching = [...documents.entries()]
        .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
        .sort(([left], [right]) => left.localeCompare(right));
      const page = matching.slice(offset, offset + pageSize).map(([, document]) => structuredClone(document));
      const nextOffset = offset + page.length;
      return Response.json({
        documents: page,
        ...(nextOffset < matching.length ? { nextPageToken: `offset:${nextOffset}` } : {}),
      });
    },
  };

  return { client, documents, calls, put, decoded, failNext };
}

function queueFake() {
  const accepted = [];
  let failures = 0;
  let attempts = 0;
  let onAccepted;
  return {
    binding: {
      async send(message) {
        attempts += 1;
        if (failures > 0) {
          failures -= 1;
          throw new Error("queue unavailable");
        }
        accepted.push(structuredClone(message));
        onAccepted?.(message);
      },
    },
    accepted,
    get attempts() { return attempts; },
    fail(count = 1) { failures += count; },
    onAccepted(callback) { onAccepted = callback; },
  };
}

function planFields({
  eventKey,
  type = "task_assigned",
  actorId = "actor",
  recipientSource,
  cursor = null,
  completed = false,
  attempts = 0,
  reconcileCursor,
}) {
  return {
    schemaVersion: 1,
    eventKey,
    type,
    actorId,
    title: "Title",
    body: "Body",
    data: {},
    recipientSource,
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
    fanout: {
      status: completed ? "completed" : "pending",
      cursor,
      attempts,
      completed,
      ...(reconcileCursor === undefined ? {} : { reconcileCursor }),
    },
  };
}

function putActiveUser(db, uid) {
  db.put(`users/${uid}`, { displayName: uid, deletionStatus: "active" });
}

function consumer(db) {
  assert.equal(typeof fanoutModule.createFanoutConsumer, "function");
  return fanoutModule.createFanoutConsumer({
    async createFirestoreClient() { return db.client; },
    now: () => NOW.getTime(),
  });
}

function env(fanoutQueue, deliveryQueue) {
  return {
    FIREBASE_PROJECT_ID: PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: "worker@example.test",
    FIREBASE_PRIVATE_KEY: "unused-in-tests",
    PUSH_FANOUT_QUEUE: fanoutQueue.binding,
    PUSH_DELIVERY_QUEUE: deliveryQueue.binding,
  };
}

test("FANOUT single-recipient events create one deterministic record and no inbox work", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "task_assigned__g__t";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    recipientSource: { kind: "users", userIds: ["recipient"] },
  }));
  putActiveUser(db, "recipient");

  const result = await consumer(db)({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));

  assert.deepEqual(deliveryQueue.accepted, [{ kind: "delivery", eventKey, recipientUid: "recipient" }]);
  const recipient = db.decoded(`pushDeliveryEvents/${eventKey}/recipients/recipient`);
  assert.equal(recipient.fields.status, "enqueued");
  assert.equal(recipient.fields.attempts, 1);
  assert.equal(db.decoded(`pushDeliveryEvents/${eventKey}`).fields.fanout.completed, true);
  assert.equal([...db.documents.keys()].some((path) => path.includes("/inbox/")), false);
  assert.equal(result.externalSubrequests, db.calls.length + fanoutQueue.attempts + deliveryQueue.attempts);
  assert.ok(result.externalSubrequests <= fanoutModule.MAX_EXTERNAL_SUBREQUESTS);
});

test("FANOUT proposal discovery paginates current members and excludes the creator", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "proposal_created__g__p";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    type: "proposal_created",
    recipientSource: { kind: "gub_members", gubId: "g", excludeUid: "creator" },
  }));
  for (const uid of ["creator", "member-a", "member-b", "member-c", "member-d", "member-e"]) {
    db.put(`gubs/g/members/${uid}`, { userId: uid });
    putActiveUser(db, uid);
  }

  const consume = consumer(db);
  const first = await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(first.completed, false);
  assert.equal(fanoutQueue.accepted.length, 1);
  assert.match(fanoutQueue.accepted[0].cursor, /^offset:/);
  const persistedCursor = db.decoded(`pushDeliveryEvents/${eventKey}`).fields.fanout.cursor;
  assert.equal(fanoutQueue.accepted[0].cursor, persistedCursor);

  await consume(fanoutQueue.accepted.shift(), env(fanoutQueue, deliveryQueue));
  assert.equal(db.decoded(`pushDeliveryEvents/${eventKey}`).fields.fanout.completed, true);
  assert.equal(db.documents.has(`pushDeliveryEvents/${eventKey}/recipients/creator`), false);
  assert.deepEqual(
    [...db.documents.keys()]
      .filter((path) => path.startsWith(`pushDeliveryEvents/${eventKey}/recipients/`))
      .map((path) => path.split("/").at(-1))
      .sort(),
    ["member-a", "member-b", "member-c", "member-d", "member-e"],
  );
});

test("FANOUT join-request discovery uses only owner and active live Platform Admins", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "community_join_request_created__c__requester__cycle";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    type: "community_join_request_created",
    actorId: "requester",
    recipientSource: {
      kind: "community_moderators",
      communityId: "c",
      ownerId: "former-owner",
      excludeUid: "requester",
    },
  }));
  db.put("communities/c", { ownerId: "owner" });
  for (const uid of ["admin-active", "admin-deleting", "admin-missing", "admin-inactive", "requester"]) {
    db.put(`platformAdmins/${uid}`, { active: uid !== "admin-inactive" });
  }
  putActiveUser(db, "owner");
  putActiveUser(db, "admin-active");
  putActiveUser(db, "admin-deleting");
  putActiveUser(db, "requester");
  db.put("accountDeletionStates/admin-deleting", { status: "scheduled" });
  db.put("communities/c/members/local-admin", { role: "admin" });
  putActiveUser(db, "local-admin");

  const consume = consumer(db);
  let message = { kind: "fanout", eventKey };
  do {
    await consume(message, env(fanoutQueue, deliveryQueue));
    message = fanoutQueue.accepted.shift();
  } while (message);

  assert.deepEqual(
    [...db.documents.keys()]
      .filter((path) => path.startsWith(`pushDeliveryEvents/${eventKey}/recipients/`))
      .map((path) => path.split("/").at(-1))
      .sort(),
    ["admin-active", "owner"],
  );
});

test("FANOUT duplicate redelivery after completion performs bounded reconciliation without duplicate DELIVERY", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "task_assigned__g__t";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    recipientSource: { kind: "users", userIds: ["recipient"] },
  }));
  putActiveUser(db, "recipient");
  const consume = consumer(db);
  await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  const callCount = db.calls.length;
  const duplicate = await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(duplicate.completed, true);
  assert.equal(db.calls.length, callCount + 2, "redelivery reads the plan and one bounded recipient page");
  assert.equal(deliveryQueue.accepted.length, 1);
});

test("FANOUT completed plans reconcile an earlier stale recipient with an independent bounded cursor", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "proposal_created__g__p";
  const planPath = `pushDeliveryEvents/${eventKey}`;
  db.put(planPath, planFields({
    eventKey,
    type: "proposal_created",
    completed: true,
    recipientSource: { kind: "gub_members", gubId: "g", excludeUid: "creator" },
  }));
  for (const uid of ["a-stale", "b-done", "c-done", "d-done", "e-done"]) {
    db.put(`${planPath}/recipients/${uid}`, {
      schemaVersion: 1,
      eventKey,
      recipientUid: uid,
      status: uid === "a-stale" ? "enqueued" : "completed",
      attempts: 1,
      createdAt: new Date("2026-09-21T10:00:00.000Z"),
      enqueuedAt: new Date("2026-09-21T10:01:00.000Z"),
    });
  }

  const consume = consumer(db);
  const first = await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(first.completed, true);
  assert.deepEqual(deliveryQueue.accepted, [{ kind: "delivery", eventKey, recipientUid: "a-stale" }]);
  assert.equal(db.decoded(`${planPath}/recipients/a-stale`).fields.attempts, 2);
  const reconciliationCursor = db.decoded(planPath).fields.fanout.reconcileCursor;
  assert.match(reconciliationCursor, /^offset:/);
  assert.deepEqual(fanoutQueue.accepted.at(-1), { kind: "fanout", eventKey, cursor: reconciliationCursor });
  assert.ok(first.externalSubrequests <= 39);

  await consume(fanoutQueue.accepted.pop(), env(fanoutQueue, deliveryQueue));
  assert.equal(db.decoded(planPath).fields.fanout.completed, true);
  assert.equal(db.decoded(planPath).fields.fanout.cursor, null, "discovery cursor remains complete");
  assert.equal(db.decoded(planPath).fields.fanout.reconcileCursor, null);
  assert.equal(deliveryQueue.accepted.length, 1);
});

test("FANOUT enforces the 40-subrequest budget and persists a continuation", async () => {
  assert.equal(fanoutModule.MAX_EXTERNAL_SUBREQUESTS, 40);
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "community_join_request_created__c__requester__cycle";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    type: "community_join_request_created",
    recipientSource: {
      kind: "community_moderators",
      communityId: "c",
      ownerId: "owner",
      excludeUid: "requester",
    },
  }));
  db.put("communities/c", { ownerId: "owner" });
  const admins = ["admin-a", "admin-b", "admin-c", "admin-d", "admin-e"];
  for (const uid of ["owner", ...admins]) {
    putActiveUser(db, uid);
    if (uid !== "owner") db.put(`platformAdmins/${uid}`, { active: true });
    db.put(`pushDeliveryEvents/${eventKey}/recipients/${uid}`, {
      schemaVersion: 1,
      eventKey,
      recipientUid: uid,
      status: "pending",
      attempts: 0,
      createdAt: new Date("2026-09-21T10:00:00.000Z"),
    });
  }

  const result = await consumer(db)({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(result.completed, false);
  assert.equal(fanoutQueue.accepted.length, 1);
  assert.equal(db.decoded(`pushDeliveryEvents/${eventKey}`).fields.fanout.cursor, fanoutQueue.accepted[0].cursor);
  assert.equal(result.externalSubrequests, db.calls.length + fanoutQueue.attempts + deliveryQueue.attempts);
  assert.ok(result.externalSubrequests <= 40, `used ${result.externalSubrequests} subrequests`);
  assert.ok(deliveryQueue.attempts <= fanoutModule.RECIPIENT_PAGE_SIZE + 1);
});

test("FANOUT retries a pending recipient after DELIVERY enqueue failure", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  deliveryQueue.fail();
  const eventKey = "task_assigned__g__t";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    recipientSource: { kind: "users", userIds: ["recipient"] },
  }));
  putActiveUser(db, "recipient");
  const consume = consumer(db);

  await assert.rejects(
    consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue)),
    /queue|fanout/i,
  );
  assert.equal(db.decoded(`pushDeliveryEvents/${eventKey}/recipients/recipient`).fields.status, "pending");
  assert.equal(db.decoded(`pushDeliveryEvents/${eventKey}`).fields.fanout.cursor, null);

  await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(deliveryQueue.accepted.length, 1);
  assert.equal(
    [...db.documents.keys()].filter((path) => path === `pushDeliveryEvents/${eventKey}/recipients/recipient`).length,
    1,
  );
});

test("FANOUT repairs Queue acceptance followed by recipient status-write failure", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "task_assigned__g__t";
  const recipientPath = `pushDeliveryEvents/${eventKey}/recipients/recipient`;
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    recipientSource: { kind: "users", userIds: ["recipient"] },
  }));
  putActiveUser(db, "recipient");
  db.failNext({ operation: "update", path: recipientPath });
  const consume = consumer(db);

  await assert.rejects(consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue)));
  assert.equal(deliveryQueue.accepted.length, 1);
  assert.equal(db.decoded(recipientPath).fields.status, "pending");

  await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(deliveryQueue.accepted.length, 2, "ambiguous acceptance may safely duplicate DELIVERY");
  assert.equal(db.decoded(recipientPath).fields.status, "enqueued");
  assert.equal(db.decoded(recipientPath).fields.attempts, 1);
});

test("FANOUT enqueue status write cannot regress a concurrently completed recipient", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "task_assigned__g__t";
  const recipientPath = `pushDeliveryEvents/${eventKey}/recipients/recipient`;
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    recipientSource: { kind: "users", userIds: ["recipient"] },
  }));
  putActiveUser(db, "recipient");
  db.put(recipientPath, {
    schemaVersion: 1,
    eventKey,
    recipientUid: "recipient",
    status: "pending",
    attempts: 2,
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
  });
  deliveryQueue.onAccepted(() => {
    db.put(recipientPath, {
      schemaVersion: 1,
      eventKey,
      recipientUid: "recipient",
      status: "completed",
      attempts: 7,
      createdAt: new Date("2026-09-21T10:00:00.000Z"),
      completedAt: NOW,
    });
  });
  const consume = consumer(db);

  await assert.rejects(
    consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue)),
    /firestore request failed/i,
  );
  assert.equal(db.decoded(recipientPath).fields.status, "completed");
  assert.equal(db.decoded(recipientPath).fields.attempts, 7);

  deliveryQueue.onAccepted(undefined);
  await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(deliveryQueue.accepted.length, 1);
  assert.equal(db.decoded(recipientPath).fields.status, "completed");
});

test("FANOUT repairs an ambiguous cursor write without recreating recipients", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "proposal_created__g__p";
  const planPath = `pushDeliveryEvents/${eventKey}`;
  db.put(planPath, planFields({
    eventKey,
    type: "proposal_created",
    recipientSource: { kind: "gub_members", gubId: "g", excludeUid: "creator" },
  }));
  for (const uid of ["member-a", "member-b", "member-c", "member-d", "member-e"]) {
    db.put(`gubs/g/members/${uid}`, { userId: uid });
    putActiveUser(db, uid);
  }
  db.failNext({ operation: "update", path: planPath, afterApply: true });
  const consume = consumer(db);

  await assert.rejects(consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue)));
  const advancedCursor = db.decoded(planPath).fields.fanout.cursor;
  assert.match(advancedCursor, /^offset:/);
  const acceptedBeforeRetry = deliveryQueue.accepted.length;

  const recovery = await consume({ kind: "fanout", eventKey }, env(fanoutQueue, deliveryQueue));
  assert.equal(recovery.stale, true);
  assert.deepEqual(fanoutQueue.accepted.at(-1), { kind: "fanout", eventKey, cursor: advancedCursor });
  assert.equal(deliveryQueue.accepted.length, acceptedBeforeRetry);
});

test("FANOUT stale continuations redirect to the persisted cursor", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  const eventKey = "proposal_created__g__p";
  db.put(`pushDeliveryEvents/${eventKey}`, planFields({
    eventKey,
    type: "proposal_created",
    cursor: "offset:8",
    recipientSource: { kind: "gub_members", gubId: "g", excludeUid: "creator" },
  }));

  const result = await consumer(db)(
    { kind: "fanout", eventKey, cursor: "offset:4" },
    env(fanoutQueue, deliveryQueue),
  );
  assert.equal(result.stale, true);
  assert.deepEqual(fanoutQueue.accepted, [{ kind: "fanout", eventKey, cursor: "offset:8" }]);
  assert.equal(deliveryQueue.accepted.length, 0);
  assert.equal(db.calls.length, 1, "stale work does not repeat recipient discovery");
});

test("FANOUT HTTP retries repair plan/enqueue and acceptance/status gaps", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  for (const [path, fields] of Object.entries({
    "users/actor": { displayName: "Actor" },
    "gubs/g": { ownerId: "owner" },
    "gubs/g/members/actor": { userId: "actor" },
    "gubs/g/tasks/t": {
      gubId: "g",
      taskId: "t",
      creatorId: "actor",
      assignedUserId: "recipient",
      status: "active",
      archived: false,
      completedAt: null,
      completedBy: null,
    },
  })) db.put(path, fields);
  const handle = createPushEventRequestHandler({
    async verifyFirebaseIdToken() { return { uid: "actor", claims: {} }; },
    async createFirestoreClient() { return db.client; },
  });
  const request = () => new Request("https://gubify.com/api/push/events", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({ type: "task_assigned", gubId: "g", taskId: "t" }),
  });
  const handlerEnv = {
    ...env(fanoutQueue, deliveryQueue),
    PUSH_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } },
  };

  fanoutQueue.fail();
  assert.equal((await handle(request(), handlerEnv, {})).status, 503);
  assert.equal(db.decoded("pushDeliveryEvents/task_assigned__g__t").fields.fanout.status, "pending");
  assert.equal((await handle(request(), handlerEnv, {})).status, 202);
  assert.equal(fanoutQueue.accepted.length, 1);

  db.failNext({ operation: "update", path: "pushDeliveryEvents/task_assigned__g__t" });
  assert.equal((await handle(request(), handlerEnv, {})).status, 503);
  assert.equal(fanoutQueue.accepted.length, 2, "Queue accepted before the status write failed");
  assert.equal((await handle(request(), handlerEnv, {})).status, 202);
  assert.equal(fanoutQueue.accepted.length, 3, "retry safely re-enqueues deterministic FANOUT");
  assert.equal([...db.documents.keys()].filter((path) => path === "pushDeliveryEvents/task_assigned__g__t").length, 1);
});

test("FANOUT HTTP status write cannot overwrite concurrent plan completion", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  for (const [path, fields] of Object.entries({
    "users/actor": { displayName: "Actor" },
    "gubs/g": { ownerId: "owner" },
    "gubs/g/members/actor": { userId: "actor" },
    "gubs/g/tasks/t": {
      gubId: "g",
      taskId: "t",
      creatorId: "actor",
      assignedUserId: "recipient",
      status: "active",
      archived: false,
      completedAt: null,
      completedBy: null,
    },
  })) db.put(path, fields);
  const planPath = "pushDeliveryEvents/task_assigned__g__t";
  fanoutQueue.onAccepted(() => {
    const plan = db.decoded(planPath).fields;
    db.put(planPath, {
      ...plan,
      fanout: { status: "completed", cursor: null, attempts: 7, completed: true },
    });
  });
  const handle = createPushEventRequestHandler({
    async verifyFirebaseIdToken() { return { uid: "actor", claims: {} }; },
    async createFirestoreClient() { return db.client; },
  });

  const response = await handle(new Request("https://gubify.com/api/push/events", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({ type: "task_assigned", gubId: "g", taskId: "t" }),
  }), {
    ...env(fanoutQueue, deliveryQueue),
    PUSH_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } },
  }, {});

  assert.equal(response.status, 503);
  assert.deepEqual(db.decoded(planPath).fields.fanout, {
    status: "completed",
    cursor: null,
    attempts: 7,
    completed: true,
  });
});

test("FANOUT HTTP retry enqueues bounded reconciliation for a completed plan", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  for (const [path, fields] of Object.entries({
    "users/actor": { displayName: "Actor" },
    "gubs/g": { ownerId: "owner" },
    "gubs/g/members/actor": { userId: "actor" },
    "gubs/g/tasks/t": {
      gubId: "g",
      taskId: "t",
      creatorId: "actor",
      assignedUserId: "recipient",
      status: "active",
      archived: false,
      completedAt: null,
      completedBy: null,
    },
  })) db.put(path, fields);
  const handle = createPushEventRequestHandler({
    async verifyFirebaseIdToken() { return { uid: "actor", claims: {} }; },
    async createFirestoreClient() { return db.client; },
  });
  const request = () => new Request("https://gubify.com/api/push/events", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({ type: "task_assigned", gubId: "g", taskId: "t" }),
  });
  const handlerEnv = {
    ...env(fanoutQueue, deliveryQueue),
    PUSH_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } },
  };

  assert.equal((await handle(request(), handlerEnv, {})).status, 202);
  fanoutQueue.accepted.length = 0;
  const planPath = "pushDeliveryEvents/task_assigned__g__t";
  const plan = db.decoded(planPath).fields;
  db.put(planPath, {
    ...plan,
    fanout: { status: "completed", cursor: null, attempts: 4, completed: true, reconcileCursor: null },
  });

  assert.equal((await handle(request(), handlerEnv, {})).status, 202);
  assert.deepEqual(fanoutQueue.accepted, [{ kind: "fanout", eventKey: "task_assigned__g__t" }]);
  assert.deepEqual(db.decoded(planPath).fields.fanout, {
    status: "completed",
    cursor: null,
    attempts: 4,
    completed: true,
    reconcileCursor: null,
  });
});

test("FANOUT HTTP repair narrowly refreshes a legitimate Community owner change", async () => {
  const db = memoryFirestore();
  const fanoutQueue = queueFake();
  const deliveryQueue = queueFake();
  db.put("users/requester", { displayName: "Requester", deletionStatus: "active" });
  db.put("communities/c", {
    communityId: "c",
    ownerId: "old-owner",
    accessMode: "approval",
    deletionStatus: "active",
  });
  db.put("communities/c/joinRequests/requester", {
    userId: "requester",
    status: "pending",
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
    requestedAt: new Date("2026-09-21T10:01:00.000Z"),
    resolvedAt: null,
    resolvedBy: null,
  });
  const handle = createPushEventRequestHandler({
    async verifyFirebaseIdToken() { return { uid: "requester", claims: {} }; },
    async createFirestoreClient() { return db.client; },
  });
  const request = () => new Request("https://gubify.com/api/push/events", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({
      type: "community_join_request_created",
      communityId: "c",
      requesterUid: "requester",
    }),
  });
  const handlerEnv = {
    ...env(fanoutQueue, deliveryQueue),
    PUSH_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } },
  };

  fanoutQueue.fail();
  assert.equal((await handle(request(), handlerEnv, {})).status, 503);
  const planPath = [...db.documents.keys()].find((path) => path.startsWith(
    "pushDeliveryEvents/community_join_request_created__c__requester__",
  ));
  assert.ok(planPath);
  assert.equal(db.decoded(planPath).fields.recipientSource.ownerId, "old-owner");

  db.put("communities/c", {
    communityId: "c",
    ownerId: "new-owner",
    accessMode: "approval",
    deletionStatus: "active",
  });
  assert.equal((await handle(request(), handlerEnv, {})).status, 202);
  assert.equal(db.decoded(planPath).fields.recipientSource.ownerId, "new-owner");
  assert.deepEqual(fanoutQueue.accepted, [{ kind: "fanout", eventKey: planPath.split("/").at(-1) }]);

  const forged = db.decoded(planPath).fields;
  db.put(planPath, {
    ...forged,
    recipientSource: { ...forged.recipientSource, communityId: "forged" },
  });
  assert.equal((await handle(request(), handlerEnv, {})).status, 503);
  assert.equal(db.decoded(planPath).fields.recipientSource.communityId, "forged");
  assert.equal(fanoutQueue.accepted.length, 1, "identity mismatch must not enqueue or self-heal");
});

test("FANOUT Queue message parsing rejects malformed cursors and discriminates DELIVERY", () => {
  assert.deepEqual(queueModule.parsePushQueueMessage({ kind: "fanout", eventKey: "event" }), {
    kind: "fanout",
    eventKey: "event",
  });
  assert.deepEqual(queueModule.parsePushQueueMessage({
    kind: "delivery",
    eventKey: "event",
    recipientUid: "recipient",
    deviceCursor: "next",
  }), {
    kind: "delivery",
    eventKey: "event",
    recipientUid: "recipient",
    deviceCursor: "next",
  });
  for (const malformed of [
    null,
    { kind: "fanout", eventKey: "event", cursor: "" },
    { kind: "fanout", eventKey: "event", unexpected: true },
    { kind: "delivery", eventKey: "event" },
  ]) assert.throws(() => queueModule.parsePushQueueMessage(malformed), /queue message/i);
});

test("FANOUT Queue batches durably defer untouched FANOUT in one bounded operation", async () => {
  assert.equal(queueModule.MAX_QUEUE_BATCH_MESSAGES, 100);
  const outcomes = [];
  const queued = [
    ...Array.from({ length: 98 }, (_, index) => ({
      body: { kind: "fanout", eventKey: `event-${index}` },
    })),
    { body: { kind: "delivery", eventKey: "event-a", recipientUid: "recipient" } },
    { body: { kind: "fanout", eventKey: "event-a", cursor: "" } },
  ].map((item, index) => ({
    ...item,
    ack() { outcomes[index] = "ack"; },
    retry() { outcomes[index] = "retry"; },
  }));
  const consumed = [];
  const deferred = [];

  const result = await queueModule.dispatchPushQueueBatch(
    { messages: queued },
    async (message) => {
      consumed.push(message);
      return { externalSubrequests: 39 };
    },
    async (messages) => { deferred.push(structuredClone(messages)); },
  );

  assert.deepEqual(consumed, [{ kind: "fanout", eventKey: "event-0" }]);
  assert.equal(deferred.length, 1, "97 untouched FANOUT messages use one Queue subrequest");
  assert.deepEqual(deferred[0], Array.from({ length: 97 }, (_, index) => ({
    kind: "fanout",
    eventKey: `event-${index + 1}`,
  })));
  assert.deepEqual(outcomes.slice(0, 98), Array.from({ length: 98 }, () => "ack"));
  assert.deepEqual(outcomes.slice(98), ["retry", "ack"]);
  assert.equal(result.externalSubrequests, 40);
});

test("FANOUT Queue deferral failure retries originals instead of acknowledging lost work", async () => {
  const outcomes = [];
  const queued = ["event-a", "event-b"].map((eventKey, index) => ({
    body: { kind: "fanout", eventKey },
    ack() { outcomes.push(`ack:${index}`); },
    retry() { outcomes.push(`retry:${index}`); },
  }));

  const result = await queueModule.dispatchPushQueueBatch(
    { messages: queued },
    async () => ({ externalSubrequests: 3 }),
    async () => { throw new Error("Queue unavailable"); },
  );

  assert.deepEqual(outcomes, ["ack:0", "retry:1"]);
  assert.equal(result.externalSubrequests, 4);
});
