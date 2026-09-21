import assert from "node:assert/strict";
import test from "node:test";

const authModule = await import("../worker/push/service-account-auth.ts").catch(() => ({}));

const NOW_MILLISECONDS = 2_000_000_000_000;
const CLIENT_EMAIL = "worker@gubify-test.iam.gserviceaccount.com";
const PRIVATE_KEY_BYTES = Buffer.from([1, 2, 3, 4, 5]);
const PRIVATE_KEY = [
  "-----BEGIN PRIVATE KEY-----",
  PRIVATE_KEY_BYTES.toString("base64"),
  "-----END PRIVATE KEY-----",
  "",
].join("\\n");
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function decodeBase64UrlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function authDependencies(fetchImplementation, observations = {}) {
  return {
    fetch: fetchImplementation,
    crypto: {
      subtle: {
        async importKey(format, keyData, algorithm, extractable, keyUsages) {
          observations.importKey = {
            format,
            keyData: Buffer.from(keyData),
            algorithm,
            extractable,
            keyUsages,
          };
          return { testKey: true };
        },
        async sign(algorithm, key, data) {
          observations.sign = {
            algorithm,
            key,
            data: new TextDecoder().decode(data),
          };
          return Uint8Array.from([9, 8, 7]);
        },
      },
    },
  };
}

test("service account signs the required OAuth assertion with normalized PEM input", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  const observations = {};
  let tokenRequest;
  const dependencies = authDependencies(async (input, init) => {
    tokenRequest = { input, init };
    return Response.json({ access_token: "access-token-1", expires_in: 3600 });
  }, observations);

  const token = await authModule.getGoogleAccessToken(
    { FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: PRIVATE_KEY },
    {},
    () => NOW_MILLISECONDS,
    dependencies,
  );

  assert.equal(token, "access-token-1");
  assert.equal(tokenRequest.input, TOKEN_URL);
  assert.equal(tokenRequest.init.method, "POST");
  assert.equal(
    new Headers(tokenRequest.init.headers).get("Content-Type"),
    "application/x-www-form-urlencoded",
  );

  const form = new URLSearchParams(tokenRequest.init.body);
  assert.equal(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  const assertionParts = form.get("assertion").split(".");
  assert.equal(assertionParts.length, 3);
  assert.deepEqual(decodeBase64UrlJson(assertionParts[0]), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(decodeBase64UrlJson(assertionParts[1]), {
    iss: CLIENT_EMAIL,
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
    aud: TOKEN_URL,
    iat: 2_000_000_000,
    exp: 2_000_003_600,
  });
  assert.equal(assertionParts[2], "CQgH");
  assert.deepEqual(observations.importKey, {
    format: "pkcs8",
    keyData: PRIVATE_KEY_BYTES,
    algorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    extractable: false,
    keyUsages: ["sign"],
  });
  assert.equal(observations.sign.algorithm, "RSASSA-PKCS1-v1_5");
  assert.deepEqual(observations.sign.key, { testKey: true });
  assert.equal(observations.sign.data, assertionParts.slice(0, 2).join("."));
});

test("service account caches an access token only until its safety-adjusted expiry", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  let nowMilliseconds = NOW_MILLISECONDS;
  let fetchCalls = 0;
  const dependencies = authDependencies(async () => {
    fetchCalls += 1;
    return Response.json({
      access_token: `access-token-${fetchCalls}`,
      expires_in: 120,
    });
  });
  const cache = {};
  const env = {
    FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: PRIVATE_KEY,
  };

  assert.equal(
    await authModule.getGoogleAccessToken(env, cache, () => nowMilliseconds, dependencies),
    "access-token-1",
  );
  nowMilliseconds += 59_999;
  assert.equal(
    await authModule.getGoogleAccessToken(env, cache, () => nowMilliseconds, dependencies),
    "access-token-1",
  );
  assert.equal(fetchCalls, 1);

  nowMilliseconds += 1;
  assert.equal(
    await authModule.getGoogleAccessToken(env, cache, () => nowMilliseconds, dependencies),
    "access-token-2",
  );
  assert.equal(fetchCalls, 2);
});

test("service account sanitizes token endpoint failures and never logs credentials or tokens", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  const secretResponse = "private-key-material access-token-from-error";
  const logCalls = [];
  const originalConsole = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  console.error = (...values) => logCalls.push(["error", ...values]);
  console.log = (...values) => logCalls.push(["log", ...values]);
  console.warn = (...values) => logCalls.push(["warn", ...values]);

  try {
    const cache = {};
    await assert.rejects(
      authModule.getGoogleAccessToken(
        { FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: PRIVATE_KEY },
        cache,
        () => NOW_MILLISECONDS,
        authDependencies(async () => new Response(secretResponse, { status: 401 })),
      ),
      (error) => {
        assert.equal(error.name, "GoogleAccessTokenError");
        assert.equal(error.message, "Unable to obtain Google access token");
        assert.doesNotMatch(String(error), /private-key-material|access-token-from-error/);
        return true;
      },
    );
    assert.deepEqual(cache, {});
    assert.deepEqual(logCalls, []);
  } finally {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  }
});

test("service account rejects malformed successful token responses without caching them", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  const invalidResponses = [
    {},
    { access_token: "", expires_in: 3600 },
    { access_token: "token", expires_in: 0 },
    { access_token: "token", expires_in: "3600" },
  ];

  for (const responseBody of invalidResponses) {
    const cache = {};
    await assert.rejects(
      authModule.getGoogleAccessToken(
        { FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: PRIVATE_KEY },
        cache,
        () => NOW_MILLISECONDS,
        authDependencies(async () => Response.json(responseBody)),
      ),
      /Unable to obtain Google access token/,
    );
    assert.deepEqual(cache, {});
  }
});

test("service account rejects invalid bearer syntax and unbounded token lifetimes", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  const invalidResponses = [
    { access_token: "token with spaces", expires_in: 3600 },
    { access_token: "token\nwith-newline", expires_in: 3600 },
    { access_token: 123, expires_in: 3600 },
    { access_token: "token", expires_in: 1.5 },
    { access_token: "token", expires_in: 86_401 },
    { access_token: "a".repeat(8_193), expires_in: 3600 },
  ];

  for (const responseBody of invalidResponses) {
    const cache = {};
    await assert.rejects(
      authModule.getGoogleAccessToken(
        { FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: PRIVATE_KEY },
        cache,
        () => NOW_MILLISECONDS,
        authDependencies(async () => Response.json(responseBody)),
      ),
      /Unable to obtain Google access token/,
    );
    assert.deepEqual(cache, {});
  }

  await assert.rejects(
    authModule.getGoogleAccessToken(
      { FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: PRIVATE_KEY },
      {},
      () => Number.MAX_SAFE_INTEGER - 1000,
      authDependencies(async () => Response.json({ access_token: "token", expires_in: 3600 })),
    ),
    /Unable to obtain Google access token/,
  );
});

test("service account single-flights concurrent cache misses", async () => {
  assert.equal(typeof authModule.getGoogleAccessToken, "function");
  let fetchCalls = 0;
  let releaseResponse;
  const responseGate = new Promise((resolve) => {
    releaseResponse = resolve;
  });
  const dependencies = authDependencies(async () => {
    fetchCalls += 1;
    await responseGate;
    return Response.json({ access_token: "shared-access-token", expires_in: 3600 });
  });
  const cache = {};
  const env = {
    FIREBASE_CLIENT_EMAIL: CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: PRIVATE_KEY,
  };

  const first = authModule.getGoogleAccessToken(
    env,
    cache,
    () => NOW_MILLISECONDS,
    dependencies,
  );
  const second = authModule.getGoogleAccessToken(
    env,
    cache,
    () => NOW_MILLISECONDS,
    dependencies,
  );
  await Promise.resolve();
  releaseResponse();

  assert.deepEqual(await Promise.all([first, second]), [
    "shared-access-token",
    "shared-access-token",
  ]);
  assert.equal(fetchCalls, 1);
  assert.equal(cache.accessToken, "shared-access-token");
});
