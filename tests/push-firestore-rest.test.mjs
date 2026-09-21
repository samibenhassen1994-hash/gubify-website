import assert from "node:assert/strict";
import test from "node:test";

const firestoreModule = await import("../worker/push/firestore-rest.ts").catch(() => ({}));

const PROJECT_ID = "gubify-test";
const ACCESS_TOKEN = "test-access-token";
const ROOT_PATH =
  "https://firestore.googleapis.com/v1/projects/gubify-test/databases/(default)/documents";
const ROOT_NAME = "projects/gubify-test/databases/(default)/documents";

function rawDocument(name, fields = {}, updateTime = "2026-09-20T10:01:00.000Z") {
  return {
    name,
    fields,
    createTime: "2026-09-20T10:00:00.000Z",
    updateTime,
  };
}

function client(fetchImplementation) {
  return {
    projectId: PROJECT_ID,
    accessToken: ACCESS_TOKEN,
    fetch: fetchImplementation,
  };
}

test("Firestore REST escapes document paths and preserves get/list query options", async () => {
  assert.equal(typeof firestoreModule.getDocument, "function");
  assert.equal(typeof firestoreModule.listDocuments, "function");
  const calls = [];
  const fetchImplementation = async (input, init) => {
    calls.push({ url: new URL(input), init });
    if (calls.length === 1) {
      return Response.json(rawDocument("document-name", { token: { stringValue: "device-token" } }));
    }
    return Response.json({
      documents: [rawDocument("listed-name", { token: { stringValue: "listed-token" } })],
      nextPageToken: "next-page",
    });
  };
  const firestore = client(fetchImplementation);

  const document = await firestoreModule.getDocument(
    firestore,
    "users/user /devices/device#1",
    { mask: ["token", "profile.display name"] },
  );
  const page = await firestoreModule.listDocuments(
    firestore,
    "users/user 1/devices",
    {
      pageSize: 20,
      pageToken: "cursor +/=?",
      orderBy: "updatedAt desc",
      mask: ["token"],
      showMissing: true,
    },
  );

  assert.equal(document.fields.token, "device-token");
  assert.equal(page.documents[0].fields.token, "listed-token");
  assert.equal(page.nextPageToken, "next-page");

  assert.equal(
    calls[0].url.origin + calls[0].url.pathname,
    `${ROOT_PATH}/users/user%20/devices/device%231`,
  );
  assert.deepEqual(calls[0].url.searchParams.getAll("mask.fieldPaths"), [
    "token",
    "profile.display name",
  ]);
  assert.equal(
    calls[1].url.origin + calls[1].url.pathname,
    `${ROOT_PATH}/users/user%201/devices`,
  );
  assert.equal(calls[1].url.searchParams.get("pageSize"), "20");
  assert.equal(calls[1].url.searchParams.get("pageToken"), "cursor +/=?");
  assert.equal(calls[1].url.searchParams.get("orderBy"), "updatedAt desc");
  assert.equal(calls[1].url.searchParams.get("showMissing"), "true");
  assert.deepEqual(calls[1].url.searchParams.getAll("mask.fieldPaths"), ["token"]);
  for (const call of calls) {
    assert.equal(new Headers(call.init.headers).get("Authorization"), `Bearer ${ACCESS_TOKEN}`);
  }
});

test("Firestore REST posts structured queries and strictly decodes string timestamp map and array values", async () => {
  assert.equal(typeof firestoreModule.runQuery, "function");
  let request;
  const structuredQuery = {
    from: [{ collectionId: "devices" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "platform" },
        op: "EQUAL",
        value: { stringValue: "android" },
      },
    },
    limit: 20,
  };
  const firestore = client(async (input, init) => {
    request = { url: new URL(input), init };
    return Response.json([
      {
        document: rawDocument("device-name", {
          label: { stringValue: "Phone" },
          updatedAt: { timestampValue: "2026-09-20T10:02:03.456Z" },
          metadata: {
            mapValue: {
              fields: {
                enabled: { booleanValue: true },
                owner: { stringValue: "user-1" },
              },
            },
          },
          tags: {
            arrayValue: {
              values: [{ stringValue: "primary" }, { stringValue: "android" }],
            },
          },
        }),
        readTime: "2026-09-20T10:03:00.000Z",
      },
      { readTime: "2026-09-20T10:03:00.000Z", skippedResults: 1 },
    ]);
  });

  const documents = await firestoreModule.runQuery(
    firestore,
    "users/user 1",
    structuredQuery,
  );

  assert.equal(
    request.url.origin + request.url.pathname,
    `${ROOT_PATH}/users/user%201:runQuery`,
  );
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(request.init.body), { structuredQuery });
  assert.equal(documents.length, 1);
  assert.equal(documents[0].fields.label, "Phone");
  assert.deepEqual(documents[0].fields.updatedAt, new Date("2026-09-20T10:02:03.456Z"));
  assert.deepEqual(documents[0].fields.metadata, { enabled: true, owner: "user-1" });
  assert.deepEqual(documents[0].fields.tags, ["primary", "android"]);
});

test("Firestore REST sends create patch and delete masks and preconditions", async () => {
  assert.equal(typeof firestoreModule.createDocument, "function");
  assert.equal(typeof firestoreModule.patchDocument, "function");
  assert.equal(typeof firestoreModule.deleteDocument, "function");
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    if (init.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return Response.json(rawDocument("write-name", { title: { stringValue: "stored" } }));
  });

  await firestoreModule.createDocument(
    firestore,
    "pushDeliveryEvents",
    "event + 1",
    { title: "Created", read: false },
    { mask: ["title", "read"] },
  );
  await firestoreModule.patchDocument(
    firestore,
    "pushDeliveryEvents/event + 1",
    { title: "Updated" },
    {
      updateMask: ["title"],
      mask: ["title"],
      precondition: { updateTime: "2026-09-20T10:01:00.000Z" },
    },
  );
  assert.equal(
    await firestoreModule.deleteDocument(
      firestore,
      "pushDeliveryEvents/event + 1",
      { precondition: { exists: true } },
    ),
    true,
  );

  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].url.origin + calls[0].url.pathname, `${ROOT_PATH}/pushDeliveryEvents`);
  assert.equal(calls[0].url.searchParams.get("documentId"), "event + 1");
  assert.deepEqual(calls[0].url.searchParams.getAll("mask.fieldPaths"), ["title", "read"]);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    fields: {
      title: { stringValue: "Created" },
      read: { booleanValue: false },
    },
  });

  assert.equal(calls[1].init.method, "PATCH");
  assert.equal(
    calls[1].url.origin + calls[1].url.pathname,
    `${ROOT_PATH}/pushDeliveryEvents/event%20%2B%201`,
  );
  assert.deepEqual(calls[1].url.searchParams.getAll("updateMask.fieldPaths"), ["title"]);
  assert.deepEqual(calls[1].url.searchParams.getAll("mask.fieldPaths"), ["title"]);
  assert.equal(
    calls[1].url.searchParams.get("currentDocument.updateTime"),
    "2026-09-20T10:01:00.000Z",
  );
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    fields: { title: { stringValue: "Updated" } },
  });

  assert.equal(calls[2].init.method, "DELETE");
  assert.equal(calls[2].url.searchParams.get("currentDocument.exists"), "true");
});

test("Firestore REST converts server timestamp sentinels into commit transforms", async () => {
  assert.equal(typeof firestoreModule.SERVER_TIMESTAMP, "symbol");
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    return Response.json({
      writeResults: [{ updateTime: "2026-09-20T10:01:00.000Z" }],
      commitTime: "2026-09-20T10:01:00.000Z",
    });
  });

  await firestoreModule.createDocument(
    firestore,
    "pushDeliveryEvents",
    "event-1",
    { type: "task_assigned", createdAt: firestoreModule.SERVER_TIMESTAMP },
  );
  await firestoreModule.patchDocument(
    firestore,
    "pushDeliveryEvents/event-1",
    { attempt: 2, updatedAt: firestoreModule.SERVER_TIMESTAMP },
    { precondition: { exists: true } },
  );
  await firestoreModule.patchDocument(
    firestore,
    "pushDeliveryEvents/event-1",
    { updatedAt: firestoreModule.SERVER_TIMESTAMP },
    { precondition: { exists: true } },
  );

  for (const call of calls) {
    assert.equal(call.init.method, "POST");
    assert.equal(call.url.origin + call.url.pathname, `${ROOT_PATH}:commit`);
  }
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    writes: [{
      update: {
        name: `${ROOT_NAME}/pushDeliveryEvents/event-1`,
        fields: { type: { stringValue: "task_assigned" } },
      },
      updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: false },
    }],
  });
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    writes: [{
      update: {
        name: `${ROOT_NAME}/pushDeliveryEvents/event-1`,
        fields: { attempt: { integerValue: "2" } },
      },
      updateMask: { fieldPaths: ["attempt"] },
      updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: true },
    }],
  });
  assert.deepEqual(JSON.parse(calls[2].init.body), {
    writes: [{
      transform: {
        document: `${ROOT_NAME}/pushDeliveryEvents/event-1`,
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
      currentDocument: { exists: true },
    }],
  });
});

test("Firestore REST treats only get/delete 404 as missing and rejects malformed values and sanitized failures", async () => {
  assert.equal(typeof firestoreModule.getDocument, "function");
  const missingFirestore = client(async () => new Response("missing", { status: 404 }));
  assert.equal(await firestoreModule.getDocument(missingFirestore, "users/user-1"), null);
  assert.equal(
    await firestoreModule.deleteDocument(missingFirestore, "users/user-1"),
    false,
  );

  const malformedFirestore = client(async () => Response.json(rawDocument("bad", {
    invalid: { stringValue: "x", booleanValue: true },
  })));
  await assert.rejects(
    firestoreModule.getDocument(malformedFirestore, "users/user-1"),
    /Malformed Firestore response/,
  );

  const secret = "test-access-token private-response-body";
  const failedFirestore = client(async () => new Response(secret, { status: 503 }));
  await assert.rejects(
    firestoreModule.listDocuments(failedFirestore, "users"),
    (error) => {
      assert.equal(error.name, "FirestoreRestError");
      assert.equal(error.status, 503);
      assert.doesNotMatch(String(error), /test-access-token|private-response-body/);
      return true;
    },
  );
});

test("Firestore REST keeps special-character document IDs unencoded inside commit resource names", async () => {
  let commitBody;
  const firestore = client(async (_input, init) => {
    commitBody = JSON.parse(init.body);
    return Response.json({
      writeResults: [{ updateTime: "2026-09-20T10:01:00.000Z" }],
      commitTime: "2026-09-20T10:01:00.000Z",
    });
  });

  await firestoreModule.createDocument(
    firestore,
    "pushDeliveryEvents",
    "event +#1",
    { createdAt: firestoreModule.SERVER_TIMESTAMP },
  );

  assert.equal(
    commitBody.writes[0].update.name,
    `${ROOT_NAME}/pushDeliveryEvents/event +#1`,
  );
});

test("Firestore REST rejects dot traversal segments across every path-bearing helper", async () => {
  let fetchCalls = 0;
  const firestore = client(async () => {
    fetchCalls += 1;
    throw new Error("fetch must not run for an invalid path");
  });
  const invalidCalls = [
    () => firestoreModule.getDocument(firestore, "users/../devices/device-1"),
    () => firestoreModule.listDocuments(firestore, "users/./devices"),
    () => firestoreModule.runQuery(firestore, "users/..", {}),
    () => firestoreModule.createDocument(firestore, "users/./devices", "device-1", {}),
    () => firestoreModule.createDocument(firestore, "users/user-1/devices", "..", {}),
    () => firestoreModule.patchDocument(firestore, "users/../devices/device-1", { ok: true }),
    () => firestoreModule.deleteDocument(firestore, "users/../devices/device-1"),
  ];

  for (const invalidCall of invalidCalls) {
    await assert.rejects(invalidCall, /Invalid Firestore (path|document ID)/);
  }
  assert.equal(fetchCalls, 0);
});

test("Firestore REST quotes generated literal field paths and preserves explicit field paths", async () => {
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    if (init.method === "PATCH") {
      return Response.json(rawDocument("patched", { ok: { booleanValue: true } }));
    }
    return Response.json({
      writeResults: [{ updateTime: "2026-09-20T10:01:00.000Z" }],
      commitTime: "2026-09-20T10:01:00.000Z",
    });
  });

  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { "a.b": "literal", "9lives": 9, "bak`tik": true },
  );
  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { "a.b": "literal" },
    { updateMask: ["nested.value"] },
  );
  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { "bak`tik": firestoreModule.SERVER_TIMESTAMP },
  );

  assert.deepEqual(calls[0].url.searchParams.getAll("updateMask.fieldPaths"), [
    "`a.b`",
    "`9lives`",
    "`bak\\`tik`",
  ]);
  assert.deepEqual(calls[1].url.searchParams.getAll("updateMask.fieldPaths"), [
    "nested.value",
  ]);
  assert.deepEqual(
    JSON.parse(calls[2].init.body).writes[0].transform.fieldTransforms,
    [{ fieldPath: "`bak\\`tik`", setToServerValue: "REQUEST_TIME" }],
  );
});

test("Firestore REST rejects an empty patch instead of replacing the whole document", async () => {
  let fetchCalls = 0;
  const firestore = client(async () => {
    fetchCalls += 1;
    return Response.json(rawDocument("unexpected"));
  });

  await assert.rejects(
    firestoreModule.patchDocument(firestore, "users/user-1", {}),
    /Invalid Firestore patch/,
  );
  assert.equal(fetchCalls, 0);
});

test("Firestore REST rejects an explicitly empty update mask", async () => {
  let fetchCalls = 0;
  const firestore = client(async () => {
    fetchCalls += 1;
    return Response.json(rawDocument("unexpected"));
  });

  await assert.rejects(
    firestoreModule.patchDocument(
      firestore,
      "users/user-1",
      { displayName: "Name" },
      { updateMask: [] },
    ),
    /Invalid Firestore patch/,
  );
  assert.equal(fetchCalls, 0);
});

test("Firestore REST permits a deletion-only patch when an explicit nonempty mask makes it safe", async () => {
  let request;
  const firestore = client(async (input, init) => {
    request = { url: new URL(input), init };
    return Response.json(rawDocument("users/user-1"));
  });

  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    {},
    { updateMask: ["obsolete", "nested.value"], precondition: { exists: true } },
  );

  assert.equal(request.init.method, "PATCH");
  assert.deepEqual(request.url.searchParams.getAll("updateMask.fieldPaths"), [
    "obsolete",
    "nested.value",
  ]);
  assert.equal(request.url.searchParams.get("currentDocument.exists"), "true");
  assert.deepEqual(JSON.parse(request.init.body), { fields: {} });
});

test("Firestore REST keeps explicit deletions when a patch otherwise contains only transforms", async () => {
  let commitBody;
  const firestore = client(async (_input, init) => {
    commitBody = JSON.parse(init.body);
    return Response.json({
      writeResults: [{ updateTime: "2026-09-20T10:01:00.000Z" }],
      commitTime: "2026-09-20T10:01:00.000Z",
    });
  });

  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { updatedAt: firestoreModule.SERVER_TIMESTAMP },
    { updateMask: ["obsolete"], precondition: { exists: true } },
  );

  assert.deepEqual(commitBody.writes[0], {
    update: { name: `${ROOT_NAME}/users/user-1`, fields: {} },
    updateMask: { fieldPaths: ["obsolete"] },
    updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
    currentDocument: { exists: true },
  });
});

test("Firestore REST preserves exact updateTime precision through a conditional-write round trip", async () => {
  const preciseUpdateTime = "2026-09-20T10:01:00.123456000Z";
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    return Response.json(rawDocument("users/user-1", {}, preciseUpdateTime));
  });

  const document = await firestoreModule.getDocument(firestore, "users/user-1");
  assert.equal(document.updateTime, preciseUpdateTime);
  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { enabled: true },
    { precondition: { updateTime: document.updateTime } },
  );

  assert.equal(
    calls[1].url.searchParams.get("currentDocument.updateTime"),
    preciseUpdateTime,
  );
});

test("Firestore REST timestamp fields retain ordinary mutable Date encoding semantics", async () => {
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    if (init.method === "PATCH") {
      return Response.json(rawDocument("users/user-1"));
    }
    return Response.json(rawDocument("users/user-1", {
      updatedAt: { timestampValue: "2026-09-20T10:02:03.456789Z" },
    }));
  });

  const document = await firestoreModule.getDocument(firestore, "users/user-1");
  const updatedAt = document.fields.updatedAt;
  assert.ok(updatedAt instanceof Date);
  updatedAt.setUTCSeconds(4);

  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { updatedAt },
  );

  assert.deepEqual(JSON.parse(calls[1].init.body), {
    fields: { updatedAt: { timestampValue: "2026-09-20T10:02:04.456Z" } },
  });
});

test("Firestore REST preserves reference and geo point types across decode and encode", async () => {
  assert.equal(typeof firestoreModule.FirestoreReference, "function");
  assert.equal(typeof firestoreModule.FirestoreGeoPoint, "function");
  const referenceName = `${ROOT_NAME}/users/user-2`;
  const calls = [];
  const firestore = client(async (input, init) => {
    calls.push({ url: new URL(input), init });
    if (init.method === "PATCH") {
      return Response.json(rawDocument("users/user-1"));
    }
    return Response.json(rawDocument("users/user-1", {
      text: { stringValue: referenceName },
      reference: { referenceValue: referenceName },
      coordinates: { mapValue: { fields: {
        latitude: { doubleValue: 45.46 },
        longitude: { doubleValue: 9.19 },
      } } },
      location: { geoPointValue: { latitude: 45.46, longitude: 9.19 } },
    }));
  });

  const document = await firestoreModule.getDocument(firestore, "users/user-1");
  assert.equal(document.fields.text, referenceName);
  assert.ok(document.fields.reference instanceof firestoreModule.FirestoreReference);
  assert.equal(document.fields.reference.name, referenceName);
  assert.deepEqual(document.fields.coordinates, { latitude: 45.46, longitude: 9.19 });
  assert.ok(document.fields.location instanceof firestoreModule.FirestoreGeoPoint);
  assert.equal(document.fields.location.latitude, 45.46);
  assert.equal(document.fields.location.longitude, 9.19);

  await firestoreModule.patchDocument(
    firestore,
    "users/user-1",
    { reference: document.fields.reference, location: document.fields.location },
  );
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    fields: {
      reference: { referenceValue: referenceName },
      location: { geoPointValue: { latitude: 45.46, longitude: 9.19 } },
    },
  });
});
