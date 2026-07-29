import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBetaProgress,
  savePreRegistration,
  validateRegistrationPayload,
} from "../lib/pre-registration.ts";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

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

test("renders the pre-registration page and form", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/pre-register", {
      headers: { accept: "text/html" },
    }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Be among the first to use Gubify/i);
  assert.match(html, /Get your launch notification/i);
  assert.match(html, /Which device would you use Gubify on/i);
});

test("home links to the pre-registration page", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  assert.match(await response.text(), /href=["']\/pre-register["']/i);
});

test("normalizes and validates registration data including UTM values", () => {
  const result = validateRegistrationPayload({
    firstName: "  Sam  ",
    email: "  SAM@EXAMPLE.COM ",
    deviceInterest: "android",
    consent: true,
    turnstileToken: "token",
    website: "",
    utmSource: " instagram ",
    utmCampaign: " launch_test ",
    landingPath: "/pre-register?utm_source=instagram",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.email, "sam@example.com");
  assert.equal(result.data.firstName, "Sam");
  assert.equal(result.data.utmSource, "instagram");
  assert.equal(result.data.utmCampaign, "launch_test");

  assert.equal(
    validateRegistrationPayload({
      email: "invalid",
      deviceInterest: "android",
      consent: true,
      turnstileToken: "token",
    }).ok,
    false,
  );
  assert.equal(
    validateRegistrationPayload({
      email: "valid@example.com",
      deviceInterest: "tablet",
      consent: true,
      turnstileToken: "token",
    }).ok,
    false,
  );
});

test("duplicate registrations remain successful without a second insert", async () => {
  let changes = 1;
  const boundValues = [];
  const database = {
    prepare(sql) {
      assert.match(sql, /ON CONFLICT\(email\) DO NOTHING/);
      return {
        bind(...values) {
          boundValues.push(values);
          return {
            run: async () => ({ meta: { changes } }),
          };
        },
      };
    },
  };
  const validation = validateRegistrationPayload({
    email: "person@example.com",
    deviceInterest: "ios",
    consent: true,
    turnstileToken: "token",
    website: "",
  });
  assert.equal(validation.ok, true);

  assert.equal(await savePreRegistration(database, validation.data, 1, "id-1"), true);
  changes = 0;
  assert.equal(await savePreRegistration(database, validation.data, 2, "id-2"), false);
  assert.equal(boundValues.length, 2);
});

test("calculates beta progress safely", () => {
  assert.deepEqual(calculateBetaProgress(1248), {
    count: 1248,
    goal: 10000,
    remaining: 8752,
    percentage: 12.48,
    goalReached: false,
  });
  assert.deepEqual(calculateBetaProgress(12000), {
    count: 12000,
    goal: 10000,
    remaining: 0,
    percentage: 100,
    goalReached: true,
  });
});

test("registration endpoints reject unsupported methods", async () => {
  const worker = await loadWorker();
  const postCount = await worker.fetch(
    new Request("http://localhost/api/pre-register/count", { method: "POST" }),
    baseEnv,
    executionContext,
  );
  const getRegistration = await worker.fetch(
    new Request("http://localhost/api/pre-register", { method: "GET" }),
    baseEnv,
    executionContext,
  );

  assert.equal(postCount.status, 405);
  assert.equal(getRegistration.status, 405);
});

test("public count endpoint returns active aggregate data only", async () => {
  const worker = await loadWorker();
  const database = {
    prepare(sql) {
      assert.match(sql, /WHERE status = \?/);
      return {
        bind(status) {
          assert.equal(status, "active");
          return {
            first: async () => ({ count: 42 }),
          };
        },
      };
    },
  };
  globalThis.__cloudflareTestEnv = { DB: database };
  const response = await worker.fetch(
    new Request("http://localhost/api/pre-register/count"),
    { ...baseEnv, DB: database },
    executionContext,
  );
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(data, {
    count: 42,
    goal: 10000,
    remaining: 9958,
    percentage: 0.42,
    goalReached: false,
  });
  assert.deepEqual(Object.keys(data).sort(), [
    "count",
    "goal",
    "goalReached",
    "percentage",
    "remaining",
  ]);
  delete globalThis.__cloudflareTestEnv;
});
