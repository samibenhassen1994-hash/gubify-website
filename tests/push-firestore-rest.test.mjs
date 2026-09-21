import assert from "node:assert/strict";
import test from "node:test";

const firestoreModule = await import("../worker/push/firestore-rest.ts").catch(() => ({}));

const PROJECT_ID = "gubify-test";
const ACCESS_TOKEN = "test-access-token";
const ROOT_PATH =
  "https://firestore.googleapis.com/v1/projects/gubify-test/databases/(default)/documents";
const ROOT_NAME = "projects/gubify-test/databases/(default)/documents";

function rawDocument(name, fields = {}) {
  return {
    name,
    fields,
    createTime: "2026-09-20T10:00:00.000Z",
    updateTime: "2026-09-20T10:01:00.000Z",
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
