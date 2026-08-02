import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateBetaProgress,
  savePreRegistration,
  validateRegistrationPayload,
} from "../lib/pre-registration.ts";
import { fetchPreRegistrationProgress } from "../lib/pre-registration-count-client.ts";
import { saveFeedback, validateFeedback } from "../lib/feedback.ts";

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
  assert.equal(
    Object.hasOwn(config, "env"),
    false,
    "redirected Wrangler configuration must not contain env",
  );
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
  assert.match(html, /Turn group conversations into real action/i);
  assert.match(html, /See what you can do with Gubify/i);
  assert.match(
    html,
    /<img(?=[^>]*\bsrc=["']\/gubify-feature-showcase\.png["'])(?=[^>]*\balt=["'][^"']*message converted into an action[^"']*["'])[^>]*>/i,
  );
  assert.match(html, /View features/i);
  assert.match(html, /role=["']dialog["']/i);
  assert.match(html, /aria-modal=["']true["']/i);
  assert.match(html, /aria-live=["']polite["']>1.*\/.*3<\/span>/i);
  assert.match(html, /aria-label=["']Previous feature["']/i);
  assert.match(html, /aria-label=["']Next feature["']/i);
  assert.match(html, /aria-label=["']Close feature gallery["']/i);
  assert.match(
    html,
    /Gubify feature showing how a chat message can be converted into a task, event, shared budget or group goal\./i,
  );
  assert.match(
    html,
    /Gubify feature showing communities based on interests such as travel, sports, food, music, gaming and technology\./i,
  );
  assert.match(
    html,
    /Gubify feature showing the request and level system where users earn experience when their answer is selected as the best\./i,
  );
  assert.match(html, /Get your launch notification/i);
  assert.match(html, /Which device would you use Gubify on/i);
  assert.match(
    html,
    /<input(?=[^>]*\bname=["']consentGiven["'])(?=[^>]*\brequired(?:=["'][^"']*["'])?)[^>]*>/i,
  );
  assert.match(html, /href=["']\/privacy["']/i);
});

test("renders the privacy policy, support center and fundraising page", async () => {
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
  const fundraisingResponse = await worker.fetch(
    new Request("http://localhost/fundraising", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const privacyHtml = await privacyResponse.text();
  const supportHtml = await supportResponse.text();
  const fundraisingHtml = await fundraisingResponse.text();

  assert.equal(privacyResponse.status, 200);
  assert.match(privacyHtml, /Privacy Policy and Personal Data Processing Notice/i);
  assert.match(privacyHtml, /2026-08-02/);
  assert.equal(supportResponse.status, 200);
  assert.match(supportHtml, /Gubify Support Center/i);
  assert.match(supportHtml, /id=["']delete-pre-registration["']/i);
  assert.match(supportHtml, /mailto:privacy@gubify\.com/i);
  assert.match(supportHtml, /href=["']\/fundraising["']/i);
  assert.equal(fundraisingResponse.status, 200);
  assert.match(fundraisingHtml, /<h1[^>]*>Support Gubify<\/h1>/i);
  assert.match(fundraisingHtml, /https:\/\/gofund\.me\/8faaabb1c/i);
});

test("renders bug and feature feedback forms from shareable query parameters", async () => {
  const worker = await loadWorker();
  const bugResponse = await worker.fetch(new Request("http://localhost/feedback?type=bug", { headers: { accept: "text/html" } }), baseEnv, executionContext);
  const featureResponse = await worker.fetch(new Request("http://localhost/feedback?type=feature", { headers: { accept: "text/html" } }), baseEnv, executionContext);
  const bugHtml = await bugResponse.text();
  const featureHtml = await featureResponse.text();
  assert.equal(bugResponse.status, 200);
  assert.equal(featureResponse.status, 200);
  assert.match(bugHtml, /Help us improve Gubify/i);
  assert.match(bugHtml, /role=["']tablist["']/i);
  assert.match(bugHtml, /Problem title/i);
  assert.match(bugHtml, /What happened\?/i);
  assert.match(bugHtml, /<input(?=[^>]*name=["']title["'])(?=[^>]*required)[^>]*>/i);
  assert.match(bugHtml, /<textarea(?=[^>]*name=["']description["'])(?=[^>]*required)[^>]*>/i);
  assert.match(featureHtml, /Feature title/i);
  assert.match(featureHtml, /Describe your idea/i);
  assert.match(featureHtml, /Why would it be useful\?/i);
  assert.match(featureHtml, /<textarea(?=[^>]*name=["']usefulness["'])(?=[^>]*required)[^>]*>/i);
});

test("support, terms and privacy expose the beta feedback resources", async () => {
  const worker = await loadWorker();
  const support = await (await worker.fetch(new Request("http://localhost/support", { headers: { accept: "text/html" } }), baseEnv, executionContext)).text();
  const termsResponse = await worker.fetch(new Request("http://localhost/terms", { headers: { accept: "text/html" } }), baseEnv, executionContext);
  const terms = await termsResponse.text();
  const privacy = await (await worker.fetch(new Request("http://localhost/privacy", { headers: { accept: "text/html" } }), baseEnv, executionContext)).text();
  assert.match(support, /Frequently asked questions/i);
  assert.match(support, /href=["']\/feedback\?type=bug["']/i);
  assert.match(support, /href=["']\/feedback\?type=feature["']/i);
  assert.match(support, /href=["']\/terms["']/i);
  assert.equal(termsResponse.status, 200);
  assert.match(terms, /Gubify Website Terms of Service/i);
  assert.match(privacy, /Feedback and diagnostic data/i);
  assert.match(privacy, /24 months/i);
});

test("validates feedback types and required fields", () => {
  assert.equal(validateFeedback({ type: "other" }).ok, false);
  assert.equal(validateFeedback({ type: "bug", title: "Bug", description: "Details", turnstileToken: "token" }).ok, true);
  assert.equal(validateFeedback({ type: "feature", title: "Idea", description: "Details", turnstileToken: "token" }).ok, false);
  assert.equal(validateFeedback({ type: "feature", title: "Idea", description: "Details", usefulness: "It saves time", turnstileToken: "token" }).ok, true);
});

test("saves bug and feature feedback with prepared bindings", async () => {
  const rows = [];
  const database = { prepare(sql) { assert.match(sql, /INSERT INTO feedback_reports/); return { bind(...values) { rows.push(values); return { run: async () => ({ success: true }) }; } }; } };
  for (const [type, usefulness] of [["bug", null], ["feature", "Useful"]]) {
    const result = validateFeedback({ type, title: `${type} title`, description: "Description", usefulness, turnstileToken: "token" });
    assert.equal(result.ok, true);
    await saveFeedback(database, result.data, 100, `${type}-id`);
  }
  assert.equal(rows.length, 2);
  assert.equal(rows[0][1], "bug");
  assert.equal(rows[1][1], "feature");
  assert.equal(rows[0].at(-1), 100);
});

test("feedback endpoint rejects invalid requests and stores a valid report", async () => {
  const worker = await loadWorker();
  const getResponse = await worker.fetch(new Request("http://localhost/api/feedback"), baseEnv, executionContext);
  assert.equal(getResponse.status, 405);
  const invalidType = await worker.fetch(new Request("http://localhost/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "other" }) }), baseEnv, executionContext);
  assert.equal(invalidType.status, 400);
  const originalFetch = globalThis.fetch;
  const inserts = [];
  const database = { prepare(sql) { assert.match(sql, /INSERT INTO feedback_reports/); return { bind(...values) { inserts.push(values); return { run: async () => ({ success: true }) }; } }; } };
  globalThis.__cloudflareTestEnv = { COUNT: database, TURNSTILE_SECRET_KEY: "secret" };
  try {
    globalThis.fetch = async () => Response.json({ success: false });
    const rejected = await worker.fetch(new Request("http://localhost/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "bug", title: "Bug", description: "Details", turnstileToken: "bad" }) }), { ...baseEnv, COUNT: database, TURNSTILE_SECRET_KEY: "secret" }, executionContext);
    assert.equal(rejected.status, 400);
    globalThis.fetch = async () => Response.json({ success: true });
    for (const payload of [
      { type: "bug", title: "Bug", description: "Details", turnstileToken: "good" },
      { type: "feature", title: "Idea", description: "Details", usefulness: "Useful", turnstileToken: "good" },
    ]) {
      const response = await worker.fetch(new Request("http://localhost/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), { ...baseEnv, COUNT: database, TURNSTILE_SECRET_KEY: "secret" }, executionContext);
      assert.equal(response.status, 200);
    }
    assert.equal(inserts.length, 2);
  } finally { globalThis.fetch = originalFetch; delete globalThis.__cloudflareTestEnv; }
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

test("home renders accessible desktop and mobile navigation", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /<nav[^>]*aria-label=["']Main navigation["'][^>]*>[\s\S]*?href=["']\/support["'][^>]*>Contact Us<\/a>[\s\S]*?<\/nav>/i,
  );
  assert.match(
    html,
    /<button(?=[^>]*aria-label=["']Open navigation menu["'])(?=[^>]*aria-expanded=["']false["'])(?=[^>]*aria-controls=["']mobile-navigation["'])[^>]*>/i,
  );
  assert.match(
    html,
    /<nav(?=[^>]*id=["']mobile-navigation["'])(?=[^>]*aria-label=["']Mobile navigation["'])[^>]*>[\s\S]*?href=["']\/support["'][^>]*>Contact Us<\/a>[\s\S]*?href=["']\/pre-register["'][^>]*>Pre-register<\/a>[\s\S]*?href=["']\/privacy["'][^>]*>Privacy Policy<\/a>[\s\S]*?href=["']\/terms["'][^>]*>Terms of Service<\/a>[\s\S]*?<\/nav>/i,
  );
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

test("count client uses normal loading initially and bypasses cache after signup", async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ input, init });
    return Response.json({
      count: 7,
      goal: 10000,
      remaining: 9993,
      percentage: 0.07,
      goalReached: false,
    });
  };

  assert.equal((await fetchPreRegistrationProgress({ fetcher })).count, 7);
  assert.equal((await fetchPreRegistrationProgress({
    fresh: true,
    fetcher,
    now: () => 12345,
  })).count, 7);
  assert.equal(calls[0].input, "/api/pre-register/count");
  assert.equal(calls[0].init.cache, undefined);
  assert.equal(calls[1].input, "/api/pre-register/count?refresh=12345");
  assert.equal(calls[1].init.cache, "no-store");
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
  assert.equal(response.headers.get("Cache-Control"), "no-store");
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

test("successful and duplicate signups refresh the authoritative count", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let changes = 1;
  let count = 10;
  const database = {
    prepare(sql) {
      if (/^SELECT COUNT/.test(sql)) {
        return {
          bind(status) {
            assert.equal(status, "active");
            return { first: async () => ({ count }) };
          },
        };
      }
      return {
        bind() {
          return {
            run: async () => {
              if (changes === 1) count += 1;
              return { meta: { changes } };
            },
          };
        },
      };
    },
  };
  globalThis.__cloudflareTestEnv = {
    COUNT: database,
    TURNSTILE_SECRET_KEY: "server-secret",
  };
  globalThis.fetch = async () => Response.json({ success: true });

  const submit = () => worker.fetch(
    new Request("http://localhost/api/pre-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "refresh@example.com",
        deviceInterest: "android",
        consentGiven: true,
        turnstileToken: "valid-token",
        website: "",
      }),
    }),
    { ...baseEnv, COUNT: database, TURNSTILE_SECRET_KEY: "server-secret" },
    executionContext,
  );
  const readCount = async () => {
    const response = await worker.fetch(
      new Request(`http://localhost/api/pre-register/count?refresh=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" },
      }),
      { ...baseEnv, COUNT: database },
      executionContext,
    );
    return response.json();
  };

  try {
    const createdResult = await (await submit()).json();
    assert.equal(createdResult.alreadyRegistered, false);
    assert.equal((await readCount()).count, 11);

    changes = 0;
    count = 12;
    const duplicateResult = await (await submit()).json();
    assert.equal(duplicateResult.alreadyRegistered, true);
    assert.equal((await readCount()).count, 12);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__cloudflareTestEnv;
  }
});
