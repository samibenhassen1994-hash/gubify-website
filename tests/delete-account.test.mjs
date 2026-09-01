import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeletionRequestEmail,
  saveDeletionRequest,
  validateDeletionRequest,
} from "../lib/delete-account.ts";

const baseEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  IMAGES: {
    input() {
      throw new Error("Image processing is not expected in this test");
    },
  },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "delete-account-test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

test("validates a complete account deletion request", () => {
  const result = validateDeletionRequest({
    email: " User@Example.com ",
    displayName: "Sami",
    notes: "I no longer have access to the app.",
    confirmation: true,
    turnstileToken: "token",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.email, "user@example.com");
  assert.equal(result.data.displayName, "Sami");
  assert.equal(result.data.confirmation, true);
});

test("rejects invalid email, missing confirmation and missing Turnstile token", () => {
  assert.equal(
    validateDeletionRequest({
      email: "not-an-email",
      confirmation: true,
      turnstileToken: "token",
    }).ok,
    false,
  );
  assert.equal(
    validateDeletionRequest({
      email: "user@example.com",
      confirmation: false,
      turnstileToken: "token",
    }).ok,
    false,
  );
  assert.equal(
    validateDeletionRequest({
      email: "user@example.com",
      confirmation: true,
    }).ok,
    false,
  );
});

test("stores a deletion request only when the email has no active request", async () => {
  const calls = [];
  const database = {
    prepare(sql) {
      assert.match(sql, /INSERT INTO account_deletion_requests/);
      assert.match(sql, /NOT EXISTS/);
      assert.match(sql, /status IN \('new', 'verifying', 'approved'\)/);
      return {
        bind(...values) {
          calls.push(values);
          return {
            run: async () => ({ meta: { changes: 1 } }),
          };
        },
      };
    },
  };

  const result = validateDeletionRequest({
    email: "user@example.com",
    displayName: "User",
    notes: "Please delete my account.",
    confirmation: true,
    turnstileToken: "token",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const inserted = await saveDeletionRequest(database, result.data, 1234, "request-id");
  assert.equal(inserted, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "request-id");
  assert.equal(calls[0][1], "user@example.com");
  assert.equal(calls[0].at(-1), "user@example.com");
});

test("reports that an active duplicate was not inserted", async () => {
  const database = {
    prepare(sql) {
      assert.match(sql, /NOT EXISTS/);
      return {
        bind() {
          return { run: async () => ({ meta: { changes: 0 } }) };
        },
      };
    },
  };
  const result = validateDeletionRequest({
    email: "user@example.com",
    confirmation: true,
    turnstileToken: "token",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(
    await saveDeletionRequest(database, result.data, 1234, "request-id"),
    false,
  );
});

test("builds a plain-text notification without exposing secrets", () => {
  const result = validateDeletionRequest({
    email: "user@example.com",
    displayName: "User",
    notes: "Lost access to my device.",
    confirmation: true,
    turnstileToken: "turnstile-secret-token",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const email = buildDeletionRequestEmail("request-id", result.data);
  assert.match(email.subject, /account deletion request/i);
  assert.match(email.text, /request-id/);
  assert.match(email.text, /user@example\.com/);
  assert.doesNotMatch(email.text, /turnstile-secret-token/);
});

test("renders the public account deletion page", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/delete-account", {
      headers: { accept: "text/html" },
    }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Delete your Gubify account/i);
  assert.match(html, /Request account deletion/i);
  assert.match(
    html,
    /<input(?=[^>]*name=["']email["'])(?=[^>]*type=["']email["'])(?=[^>]*required)[^>]*>/i,
  );
  assert.match(
    html,
    /<input(?=[^>]*name=["']confirmation["'])(?=[^>]*type=["']checkbox["'])(?=[^>]*required)[^>]*>/i,
  );
  assert.match(html, /href=["']\/privacy["']/i);
});

test("support Contact Gubify section links to account deletion", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/support", {
      headers: { accept: "text/html" },
    }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /<section[^>]*aria-labelledby=["']contact-title["'][^>]*>[\s\S]*?href=["']\/delete-account["'][^>]*>[\s\S]*?Delete account[\s\S]*?<\/section>/i,
  );
});

test("account deletion endpoint stores a verified request and sends notification", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  const inserts = [];
  const updates = [];
  const outbound = [];
  const database = {
    prepare(sql) {
      if (/INSERT INTO account_deletion_requests/.test(sql)) {
        assert.match(sql, /NOT EXISTS/);
        return {
          bind(...values) {
            inserts.push(values);
            return { run: async () => ({ meta: { changes: 1 } }) };
          },
        };
      }
      if (/UPDATE account_deletion_requests SET notification_status/.test(sql)) {
        return {
          bind(...values) {
            updates.push(values);
            return { run: async () => ({ success: true }) };
          },
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  globalThis.__cloudflareTestEnv = {
    COUNT: database,
    TURNSTILE_SECRET_KEY: "secret",
    RESEND_API_KEY: "resend-secret",
    DELETE_REQUEST_FROM_EMAIL: "Gubify <no-reply@gubify.com>",
    DELETE_REQUEST_TO_EMAIL: "privacy@gubify.com",
  };

  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      outbound.push({ url, init });
      if (url.includes("challenges.cloudflare.com/turnstile")) {
        return Response.json({ success: true });
      }
      if (url === "https://api.resend.com/emails") {
        return Response.json({ id: "email-id" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const response = await worker.fetch(
      new Request("http://localhost/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "User@Example.com",
          displayName: "User",
          notes: "Lost access to the app",
          confirmation: true,
          turnstileToken: "valid-token",
        }),
      }),
      {
        ...baseEnv,
        COUNT: database,
        TURNSTILE_SECRET_KEY: "secret",
        RESEND_API_KEY: "resend-secret",
        DELETE_REQUEST_FROM_EMAIL: "Gubify <no-reply@gubify.com>",
        DELETE_REQUEST_TO_EMAIL: "privacy@gubify.com",
      },
      executionContext,
    );

    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.ok, true);
    assert.equal(typeof result.requestId, "string");
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0][1], "user@example.com");
    assert.equal(updates.length, 1);
    assert.equal(updates[0][0], "sent");
    assert.equal(outbound.length, 2);

    const resendRequest = outbound.find(
      (entry) => entry.url === "https://api.resend.com/emails",
    );
    assert.ok(resendRequest);
    const resendBody = JSON.parse(String(resendRequest.init?.body ?? "{}"));
    assert.deepEqual(resendBody.to, ["privacy@gubify.com"]);
    assert.equal(resendBody.reply_to, "user@example.com");
    assert.doesNotMatch(resendBody.text, /valid-token/);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__cloudflareTestEnv;
  }
});

test("account deletion endpoint rejects an active duplicate without emailing", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  const outbound = [];
  const database = {
    prepare(sql) {
      if (/INSERT INTO account_deletion_requests/.test(sql)) {
        return {
          bind() {
            return { run: async () => ({ meta: { changes: 0 } }) };
          },
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  globalThis.__cloudflareTestEnv = {
    COUNT: database,
    TURNSTILE_SECRET_KEY: "secret",
  };

  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      outbound.push(url);
      if (url.includes("challenges.cloudflare.com/turnstile")) {
        return Response.json({ success: true });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const response = await worker.fetch(
      new Request("http://localhost/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          confirmation: true,
          turnstileToken: "valid-token",
        }),
      }),
      { ...baseEnv, COUNT: database, TURNSTILE_SECRET_KEY: "secret" },
      executionContext,
    );
    const result = await response.json();

    assert.equal(response.status, 409);
    assert.equal(result.ok, false);
    assert.equal(result.field, "email");
    assert.match(result.error, /already being processed/i);
    assert.equal(outbound.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__cloudflareTestEnv;
  }
});
