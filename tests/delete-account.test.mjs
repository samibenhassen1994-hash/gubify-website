import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeletionRequestEmail,
  saveDeletionRequest,
  validateDeletionRequest,
} from "../lib/delete-account.ts";

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

test("stores a deletion request with pending notification status", async () => {
  const rows = [];
  const database = {
    prepare(sql) {
      assert.match(sql, /INSERT INTO account_deletion_requests/);
      return {
        bind(...values) {
          rows.push(values);
          return { run: async () => ({ success: true }) };
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

  await saveDeletionRequest(database, result.data, 1234, "request-id");
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "request-id");
  assert.equal(rows[0][1], "user@example.com");
  assert.equal(rows[0].at(-4), "new");
  assert.equal(rows[0].at(-3), "pending");
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
