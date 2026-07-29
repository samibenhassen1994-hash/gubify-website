import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateBetaProgress,
  savePreRegistration,
  validateRegistrationPayload,
} from "../lib/pre-registration.ts";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("generated deploy config preserves the COUNT D1 binding", async () => {
  const config = JSON.parse(
    await readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  );
  const expected = {
    binding: "COUNT",
    database_name: "gubify-pre-registrations",
    database_id: "8e4b92c0-c106-4639-93b7-555522433af8",
  };

  assert.deepEqual(config.d1_databases, [expected]);
  assert.deepEqual(config.env.production.d1_databases, [expected]);
});

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
  assert.match(
    html,
    /<input(?=[^>]*\bname=["']consentGiven["'])(?=[^>]*\brequired(?:=["'][^"']*["'])?)[^>]*>/i,
  );
  assert.match(html, /href=["']\/privacy["']/i);
});

test("renders the privacy policy and support center", async () => {
  const worker = await loadWorker();
  const privacyResponse = await worker.fetch(
    new Request("http://localhost/privacy", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const supportResponse = await worker.fetch(
    new Request("http://localhost/support", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const privacyHtml = await privacyResponse.text();
  const supportHtml = await supportResponse.text();

  assert.equal(privacyResponse.status, 200);
  assert.match(privacyHtml, /Privacy Policy and Personal Data Processing Notice/i);
  assert.match(privacyHtml, /2026-07-29/);
  assert.equal(supportResponse.status, 200);
  assert.match(supportHtml, /Gubify Support Center/i);
  assert.match(supportHtml, /id=["']delete-pre-registration["']/i);
  assert.match(supportHtml, /mailto:privacy@gubify\.com/i);
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
    consentGiven: true,
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
      consentGiven: true,
      turnstileToken: "token",
    }).ok,
    false,
  );
  assert.equal(
    validateRegistrationPayload({
      email: "valid@example.com",
      deviceInterest: "tablet",
      consentGiven: true,
      turnstileToken: "token",
    }).ok,
    false,
  );
  assert.equal(
    validateRegistrationPayload({
      email: "valid@example.com",
      deviceInterest: "android",
      consentGiven: false,
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
    consentGiven: true,
    turnstileToken: "token",
    website: "",
  });
  assert.equal(validation.ok, true);

  assert.equal(await savePreRegistration(database, validation.data, 1, "id-1"), true);
  assert.equal(boundValues[0][5], true);
  assert.equal(boundValues[0][6], 1);
  assert.equal(boundValues[0][7], "2026-07-29");
  changes = 0;
  assert.equal(await savePreRegistration(database, validation.data, 2, "id-2"), false);
  assert.equal(boundValues.length, 2);
});

test("valid registration passes Turnstile and is saved", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  const savedValues = [];
  const database = {
    prepare(sql) {
      assert.match(sql, /privacy_policy_version/);
      return {
        bind(...values) {
          savedValues.push(values);
          return { run: async () => ({ meta: { changes: 1 } }) };
        },
      };
    },
  };
  globalThis.__cloudflareTestEnv = {
    COUNT: database,
    TURNSTILE_SECRET_KEY: "server-secret",
  };
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init.method, "POST");
    assert.equal(init.body.get("secret"), "server-secret");
    assert.equal(init.body.get("response"), "valid-token");
    return Response.json({ success: true });
  };

  try {
    const response = await worker.fetch(
      new Request("http://localhost/api/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "valid@example.com",
          firstName: "Sami",
          deviceInterest: "android",
          consentGiven: true,
          turnstileToken: "valid-token",
          website: "",
        }),
      }),
      { ...baseEnv, COUNT: database, TURNSTILE_SECRET_KEY: "server-secret" },
      executionContext,
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.ok, true);
    assert.equal(savedValues.length, 1);
    assert.equal(savedValues[0][5], true);
    assert.equal(savedValues[0][7], "2026-07-29");
    assert.equal(typeof savedValues[0][6], "number");
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__cloudflareTestEnv;
  }
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
  globalThis.__cloudflareTestEnv = { COUNT: database };
  const response = await worker.fetch(
    new Request("http://localhost/api/pre-register/count"),
    { ...baseEnv, COUNT: database },
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
