import assert from "node:assert/strict";
import test from "node:test";

const authModule = await import("../worker/push/firebase-id-token.ts").catch(() => ({}));
const handlerModule = await import("../worker/push/handler.ts").catch(() => ({}));

const CERTIFICATE_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const PROJECT_ID = "gubify-test";
const NOW_SECONDS = 2_000_000_000;

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function derLength(length) {
  if (length < 128) {
    return Buffer.from([length]);
  }
  const bytes = [];
  for (let remaining = length; remaining > 0; remaining >>= 8) {
    bytes.unshift(remaining & 0xff);
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derElement(tag, value) {
  return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]);
}

function testCertificatePem(spki) {
  const emptySequence = derElement(0x30, Buffer.alloc(0));
  const tbsCertificate = derElement(
    0x30,
    Buffer.concat([
      derElement(0x02, Buffer.from([1])),
      emptySequence,
      emptySequence,
      emptySequence,
      emptySequence,
      spki,
    ]),
  );
  const certificate = derElement(
    0x30,
    Buffer.concat([tbsCertificate, emptySequence, derElement(0x03, Buffer.from([0]))]),
  );
  return `-----BEGIN CERTIFICATE-----\n${certificate.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----\n`;
}

async function createSigner(kid = "test-kid") {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const spki = Buffer.from(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const certificatePem = testCertificatePem(spki);

  return {
    kid,
    certificatePem,
    async token(claimOverrides = {}, headerOverrides = {}, signingKey = keyPair.privateKey) {
      const header = { alg: "RS256", kid, typ: "JWT", ...headerOverrides };
      const claims = {
        iss: `https://securetoken.google.com/${PROJECT_ID}`,
        aud: PROJECT_ID,
        sub: "firebase-user-1",
        exp: NOW_SECONDS + 3600,
        iat: NOW_SECONDS - 30,
        auth_time: NOW_SECONDS - 60,
        ...claimOverrides,
      };
      const encodedHeader = base64Url(JSON.stringify(header));
      const encodedClaims = base64Url(JSON.stringify(claims));
      const signingInput = `${encodedHeader}.${encodedClaims}`;
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        signingKey,
        new TextEncoder().encode(signingInput),
      );
      return `${signingInput}.${base64Url(Buffer.from(signature))}`;
    },
  };
}

class MemoryCache {
  entries = new Map();

  async match(request) {
    return this.entries.get(request.url)?.clone();
  }

  async put(request, response) {
    this.entries.set(request.url, response.clone());
  }
}

function certificateFetch(certificates, maxAge = 3600, calls = [], additionalHeaders = {}) {
  return async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    calls.push(request.url);
    assert.equal(request.url, CERTIFICATE_URL);
    return Response.json(certificates, {
      headers: {
        "Cache-Control": `public, max-age=${maxAge}`,
        ...additionalHeaders,
      },
    });
  };
}

function verificationOptions(certificates, overrides = {}) {
  return {
    cache: new MemoryCache(),
    fetch: certificateFetch(certificates),
    now: () => NOW_SECONDS * 1000,
    ...overrides,
  };
}

const signer = await createSigner();

test("verifies a complete RS256 Firebase ID token and returns its bounded subject", async () => {
  assert.equal(typeof authModule.verifyFirebaseIdToken, "function");
  const verified = await authModule.verifyFirebaseIdToken(
    await signer.token(),
    PROJECT_ID,
    verificationOptions({ [signer.kid]: signer.certificatePem }),
  );

  assert.equal(verified.uid, "firebase-user-1");
  assert.equal(verified.claims.aud, PROJECT_ID);
});

test("rejects wrong algorithms, missing kids, unknown kids, and invalid signatures", async () => {
  const otherSigner = await createSigner("other-kid");
  const wrongKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const cases = [
    await signer.token({}, { alg: "HS256" }),
    await signer.token({}, { kid: undefined }),
    await signer.token({}, { kid: "unknown-kid" }),
    await signer.token({}, {}, wrongKeyPair.privateKey),
  ];

  for (const token of cases) {
    await assert.rejects(
      authModule.verifyFirebaseIdToken(
        token,
        PROJECT_ID,
        verificationOptions({
          [signer.kid]: signer.certificatePem,
          [otherSigner.kid]: otherSigner.certificatePem,
        }),
      ),
      /invalid firebase id token/i,
    );
  }
});

test("rejects invalid issuer, audience, subject, expiration, issued-at, and auth-time claims", async () => {
  const invalidClaims = [
    { iss: "https://securetoken.google.com/another-project" },
    { aud: "another-project" },
    { sub: "" },
    { sub: "u".repeat(129) },
    { exp: NOW_SECONDS - 301 },
    { iat: NOW_SECONDS + 301 },
    { auth_time: NOW_SECONDS + 301 },
    { exp: "not-a-number" },
    { iat: null },
    { auth_time: null },
    { iat: -1 },
    { auth_time: -1 },
  ];

  for (const claims of invalidClaims) {
    await assert.rejects(
      authModule.verifyFirebaseIdToken(
        await signer.token(claims),
        PROJECT_ID,
        verificationOptions({ [signer.kid]: signer.certificatePem }),
      ),
      /invalid firebase id token/i,
    );
  }
});

test("accepts claim timestamps at the documented five-minute clock-skew boundary", async () => {
  const token = await signer.token({
    exp: NOW_SECONDS - 300,
    iat: NOW_SECONDS + 300,
    auth_time: NOW_SECONDS + 300,
  });
  const verified = await authModule.verifyFirebaseIdToken(
    token,
    PROJECT_ID,
    verificationOptions({ [signer.kid]: signer.certificatePem }),
  );
  assert.equal(verified.uid, "firebase-user-1");
});

test("refreshes cached certificates immediately when a token uses an unknown kid", async () => {
  const rotatedSigner = await createSigner("rotated-kid");
  const cache = new MemoryCache();
  await cache.put(
    new Request(CERTIFICATE_URL),
    Response.json({ [signer.kid]: signer.certificatePem }, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "X-Gubify-Certificates-Expires-At": String((NOW_SECONDS + 3600) * 1000),
      },
    }),
  );
  const calls = [];
  const verified = await authModule.verifyFirebaseIdToken(
    await rotatedSigner.token(),
    PROJECT_ID,
    verificationOptions(
      { [rotatedSigner.kid]: rotatedSigner.certificatePem },
      { cache, fetch: certificateFetch({ [rotatedSigner.kid]: rotatedSigner.certificatePem }, 3600, calls) },
    ),
  );

  assert.equal(verified.uid, "firebase-user-1");
  assert.equal(calls.length, 1);
});

test("reuses Cache API certificates only for the endpoint max-age", async () => {
  let nowMilliseconds = NOW_SECONDS * 1000;
  const cache = new MemoryCache();
  const calls = [];
  const options = verificationOptions(
    { [signer.kid]: signer.certificatePem },
    {
      cache,
      fetch: certificateFetch({ [signer.kid]: signer.certificatePem }, 60, calls),
      now: () => nowMilliseconds,
    },
  );
  const token = await signer.token();

  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  nowMilliseconds += 59_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 1);

  nowMilliseconds += 1_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 2);
});

test("subtracts upstream Age from certificate cache freshness", async () => {
  let nowMilliseconds = NOW_SECONDS * 1000;
  const cache = new MemoryCache();
  const calls = [];
  const options = verificationOptions(
    { [signer.kid]: signer.certificatePem },
    {
      cache,
      fetch: certificateFetch(
        { [signer.kid]: signer.certificatePem },
        60,
        calls,
        { Age: "30" },
      ),
      now: () => nowMilliseconds,
    },
  );
  const token = await signer.token();

  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  const cached = await cache.match(new Request(CERTIFICATE_URL));
  assert.equal(cached.headers.get("Cache-Control"), "public, max-age=30");
  assert.equal(
    cached.headers.get("X-Gubify-Certificates-Expires-At"),
    String(nowMilliseconds + 30_000),
  );

  nowMilliseconds += 29_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 1);

  nowMilliseconds += 1_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 2);
});

test("advances upstream Age across certificate fetch and body consumption", async () => {
  const startedAt = NOW_SECONDS * 1000;
  let nowMilliseconds = startedAt;
  const cache = new MemoryCache();
  const calls = [];
  const certificates = { [signer.kid]: signer.certificatePem };
  const options = verificationOptions(certificates, {
    cache,
    now: () => nowMilliseconds,
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      calls.push(request.url);
      assert.equal(request.url, CERTIFICATE_URL);
      nowMilliseconds += 4_000;
      return {
        ok: true,
        headers: new Headers({
          Age: "30",
          "Cache-Control": "public, max-age=60",
        }),
        async json() {
          nowMilliseconds += 6_000;
          return certificates;
        },
      };
    },
  });
  const token = await signer.token();

  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  const cached = await cache.match(new Request(CERTIFICATE_URL));
  assert.equal(cached.headers.get("Cache-Control"), "public, max-age=20");
  assert.equal(
    cached.headers.get("X-Gubify-Certificates-Expires-At"),
    String(startedAt + 30_000),
  );

  nowMilliseconds += 19_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 1);

  nowMilliseconds += 1_000;
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  assert.equal(calls.length, 2);
});

test("does not cache certificates that become stale while the response is consumed", async () => {
  let nowMilliseconds = NOW_SECONDS * 1000;
  const cache = new MemoryCache();
  const calls = [];
  const certificates = { [signer.kid]: signer.certificatePem };
  const options = verificationOptions(certificates, {
    cache,
    now: () => nowMilliseconds,
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      calls.push(request.url);
      assert.equal(request.url, CERTIFICATE_URL);
      return {
        ok: true,
        headers: new Headers({
          Age: "30",
          "Cache-Control": "public, max-age=60",
        }),
        async json() {
          nowMilliseconds += 30_000;
          return certificates;
        },
      };
    },
  });
  const token = await signer.token();

  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);

  assert.equal(calls.length, 2);
  assert.equal(cache.entries.size, 0);
});

test("does not cache an already-stale certificate response", async () => {
  const cache = new MemoryCache();
  const calls = [];
  const options = verificationOptions(
    { [signer.kid]: signer.certificatePem },
    {
      cache,
      fetch: certificateFetch(
        { [signer.kid]: signer.certificatePem },
        60,
        calls,
        { Date: new Date((NOW_SECONDS - 61) * 1000).toUTCString() },
      ),
    },
  );
  const token = await signer.token();

  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);
  await authModule.verifyFirebaseIdToken(token, PROJECT_ID, options);

  assert.equal(calls.length, 2);
  assert.equal(cache.entries.size, 0);
});

function handlerEnv(rateLimitResults) {
  const queueMessages = [];
  return {
    env: {
      FIREBASE_PROJECT_ID: PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: "unused@example.com",
      FIREBASE_PRIVATE_KEY: "unused",
      PUSH_FANOUT_QUEUE: { async send(message) { queueMessages.push(message); } },
      PUSH_DELIVERY_QUEUE: { async send(message) { queueMessages.push(message); } },
      PUSH_EVENTS_RATE_LIMITER: {
        async limit() {
          return { success: rateLimitResults.shift() ?? true };
        },
      },
    },
    queueMessages,
  };
}

function validHandlerRequest() {
  return new Request("https://gubify.com/api/push/events", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "CF-Connecting-IP": "203.0.113.9",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "task_assigned", gubId: "gub-1", taskId: "task-1" }),
  });
}

test("source-IP limiting happens before certificate work and fails closed", async () => {
  assert.equal(typeof handlerModule.createPushEventRequestHandler, "function");
  let verificationCalls = 0;
  const handle = handlerModule.createPushEventRequestHandler({
    async verifyFirebaseIdToken() {
      verificationCalls += 1;
      return { uid: "firebase-user-1", claims: {} };
    },
  });
  const { env, queueMessages } = handlerEnv([false]);
  const response = await handle(validHandlerRequest(), env, {});

  assert.equal(response.status, 429);
  assert.equal(verificationCalls, 0);
  assert.deepEqual(queueMessages, []);
});

test("verified-UID limiting happens immediately after authentication and before event work", async () => {
  const keys = [];
  const handle = handlerModule.createPushEventRequestHandler({
    async verifyFirebaseIdToken() {
      return { uid: "firebase-user-1", claims: {} };
    },
    onRateLimitKey(key) {
      keys.push(key);
    },
  });
  const { env, queueMessages } = handlerEnv([true, false]);
  const response = await handle(validHandlerRequest(), env, {});

  assert.equal(response.status, 429);
  assert.equal(keys.length, 2);
  assert.match(keys[0], /^ip:[a-f0-9]{64}$/);
  assert.match(keys[1], /^uid:[a-f0-9]{64}$/);
  assert.deepEqual(queueMessages, []);
});

test("the authenticated handler stays fail-closed when service credentials are unavailable", async () => {
  const handle = handlerModule.createPushEventRequestHandler({
    async verifyFirebaseIdToken() {
      return { uid: "firebase-user-1", claims: {} };
    },
  });
  const { env, queueMessages } = handlerEnv([true, true]);
  const response = await handle(validHandlerRequest(), env, {});

  assert.equal(response.status, 503);
  assert.deepEqual(queueMessages, []);
});
