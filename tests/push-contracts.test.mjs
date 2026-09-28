import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const vinextStubs = new Map([
  [
    "vinext/server/image-optimization",
    "export const DEFAULT_DEVICE_SIZES = []; export const DEFAULT_IMAGE_SIZES = []; export async function handleImageOptimization() { throw new Error('not used'); }",
  ],
  [
    "vinext/server/app-router-entry",
    "export default { fetch(request) { return new Response(`vinext:${new URL(request.url).pathname}`, { status: 202 }); } };",
  ],
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = vinextStubs.get(specifier);
    if (source) {
      return {
        url: `data:text/javascript,${encodeURIComponent(source)}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const contracts = await import("../worker/push/contracts.ts").catch(() => ({}));

const validBodies = [
  { type: "task_assigned", gubId: "gub-1", taskId: "task-1" },
  { type: "proposal_created", gubId: "gub-1", proposalId: "proposal-1" },
  {
    type: "community_answer_created",
    communityId: "community-1",
    askId: "ask-1",
    answerId: "answer-1",
  },
  {
    type: "community_best_answer_selected",
    communityId: "community-1",
    askId: "ask-1",
    answerId: "answer-1",
  },
  {
    type: "community_join_request_created",
    communityId: "community-1",
    requesterUid: "requester-1",
  },
  {
    type: "community_join_request_resolved",
    communityId: "community-1",
    requesterUid: "requester-1",
  },
];

test("accepts exactly the six approved discriminated request bodies", () => {
  assert.equal(typeof contracts.parsePushEventRequest, "function");
  for (const body of validBodies) {
    assert.deepEqual(contracts.parsePushEventRequest(body), body);
  }
});

test("rejects unknown event types and missing or empty identifiers", () => {
  const invalidBodies = [
    { type: "chat_message_created", chatId: "chat-1" },
    { type: "task_assigned", gubId: "gub-1" },
    { type: "task_assigned", gubId: "", taskId: "task-1" },
    { type: "proposal_created", gubId: "gub-1", proposalId: "   " },
    {
      type: "community_answer_created",
      communityId: "community-1",
      askId: "ask-1",
      answerId: "",
    },
    {
      type: "community_join_request_resolved",
      communityId: "community-1",
      requesterUid: "",
    },
  ];

  for (const body of invalidBodies) {
    assert.throws(() => contracts.parsePushEventRequest(body), /invalid push event request/i);
  }
});

test("rejects prototype-property event type names as schema errors", () => {
  for (const type of ["constructor", "__proto__"]) {
    assert.throws(
      () => contracts.parsePushEventRequest({ type }),
      /invalid push event request/i,
    );
  }
});

test("rejects client-controlled recipients and notification copy plus every unknown key", () => {
  for (const extra of [
    { recipientIds: ["user-1"] },
    { title: "Forged title" },
    { body: "Forged body" },
    { requestedAt: "2026-09-20T00:00:00Z" },
  ]) {
    assert.throws(
      () => contracts.parsePushEventRequest({ ...validBodies[0], ...extra }),
      /invalid push event request/i,
    );
  }
});

test("rejects non-object JSON values", () => {
  for (const value of [null, [], "task_assigned", 1, true]) {
    assert.throws(() => contracts.parsePushEventRequest(value), /invalid push event request/i);
  }
});

test("rejects non-POST requests before reading JSON", async () => {
  assert.equal(typeof contracts.readPushEventRequest, "function");
  const responseError = await contracts.readPushEventRequest(
    new Request("https://gubify.com/api/push/events", { method: "GET" }),
  ).catch((error) => error);

  assert.equal(responseError.status, 405);
});

test("rejects malformed and oversized JSON bodies", async () => {
  const malformed = await contracts.readPushEventRequest(
    new Request("https://gubify.com/api/push/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }),
  ).catch((error) => error);
  assert.equal(malformed.status, 400);

  const oversized = await contracts.readPushEventRequest(
    new Request("https://gubify.com/api/push/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBodies[0], padding: "x".repeat(5000) }),
    }),
  ).catch((error) => error);
  assert.equal(oversized.status, 413);
});

test("cancels an oversized streamed body as soon as the byte limit is exceeded", async () => {
  let cancelled = false;
  let pulls = 0;
  const chunks = [
    new Uint8Array(3000),
    new Uint8Array(2000),
    new Uint8Array(1000),
  ];
  const body = new ReadableStream(
    {
      pull(controller) {
        pulls += 1;
        const chunk = chunks.shift();
        if (chunk) {
          controller.enqueue(chunk);
        } else {
          controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );

  const responseError = await contracts.readPushEventRequest(
    new Request("https://gubify.com/api/push/events", {
      method: "POST",
      body,
      duplex: "half",
    }),
  ).catch((error) => error);

  assert.equal(responseError.status, 413);
  assert.equal(cancelled, true);
  assert.equal(pulls, 2);
  assert.equal(chunks.length, 1);
});

test("wires only the exact push events path and preserves vinext fallback routing", async () => {
  const { default: worker } = await import("../worker/index.ts");
  const context = { waitUntil() {}, passThroughOnException() {} };

  const pushResponse = await worker.fetch(
    new Request("https://gubify.com/api/push/events", { method: "GET" }),
    {},
    context,
  );
  assert.equal(pushResponse.status, 405);
  assert.equal(pushResponse.headers.get("Allow"), "POST");

  const fallbackResponse = await worker.fetch(
    new Request("https://gubify.com/api/push/events/extra"),
    {},
    context,
  );
  assert.equal(fallbackResponse.status, 202);
  assert.equal(await fallbackResponse.text(), "vinext:/api/push/events/extra");
});
