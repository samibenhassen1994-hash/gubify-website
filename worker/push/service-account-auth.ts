export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_SERVICE_ACCOUNT_SCOPES = [
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/firebase.messaging",
] as const;

const ASSERTION_LIFETIME_SECONDS = 3600;
const ACCESS_TOKEN_EXPIRY_SAFETY_MILLISECONDS = 60_000;
const MAX_ACCESS_TOKEN_LIFETIME_SECONDS = 86_400;
const MAX_ACCESS_TOKEN_LENGTH = 8192;
const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9\-._~+/]+=*$/;

export interface ServiceAccountEnv {
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

export interface GoogleAccessTokenCache {
  accessToken?: string;
  expiresAtMilliseconds?: number;
  refreshPromise?: Promise<string>;
}

export interface ServiceAccountAuthDependencies {
  fetch?: typeof fetch;
  crypto?: Crypto;
}

export class GoogleAccessTokenError extends Error {
  constructor() {
    super("Unable to obtain Google access token");
    this.name = "GoogleAccessTokenError";
  }
}

function tokenError(): never {
  throw new GoogleAccessTokenError();
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function encodeJson(value: Record<string, unknown>): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function privateKeyBytes(privateKey: string): ArrayBuffer {
  const normalized = privateKey.replaceAll("\\n", "\n").trim();
  const match = normalized.match(
    /^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PRIVATE KEY-----$/,
  );
  if (!match) {
    return tokenError();
  }

  try {
    const decoded = atob(match[1].replace(/\s/g, ""));
    if (decoded.length === 0) {
      return tokenError();
    }
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } catch {
    return tokenError();
  }
}

async function createAssertion(
  env: ServiceAccountEnv,
  nowMilliseconds: number,
  cryptoImplementation: Crypto,
): Promise<string> {
  if (
    typeof env?.FIREBASE_CLIENT_EMAIL !== "string" ||
    env.FIREBASE_CLIENT_EMAIL.length === 0 ||
    typeof env.FIREBASE_PRIVATE_KEY !== "string" ||
    !cryptoImplementation?.subtle
  ) {
    return tokenError();
  }

  const issuedAt = Math.floor(nowMilliseconds / 1000);
  const encodedHeader = encodeJson({ alg: "RS256", typ: "JWT" });
  const encodedClaims = encodeJson({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: GOOGLE_SERVICE_ACCOUNT_SCOPES.join(" "),
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + ASSERTION_LIFETIME_SECONDS,
  });
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const key = await cryptoImplementation.subtle.importKey(
    "pkcs8",
    privateKeyBytes(env.FIREBASE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoImplementation.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

function isTokenResponse(
  value: unknown,
): value is { access_token: string; expires_in: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const response = value as Record<string, unknown>;
  return (
    isBearerToken(response.access_token) &&
    typeof response.expires_in === "number" &&
    Number.isSafeInteger(response.expires_in) &&
    response.expires_in > 0 &&
    response.expires_in <= MAX_ACCESS_TOKEN_LIFETIME_SECONDS
  );
}

function isBearerToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ACCESS_TOKEN_LENGTH &&
    BEARER_TOKEN_PATTERN.test(value)
  );
}

async function refreshGoogleAccessToken(
  env: ServiceAccountEnv,
  cache: GoogleAccessTokenCache,
  now: () => number,
  dependencies: ServiceAccountAuthDependencies,
  assertionTimeMilliseconds: number,
): Promise<string> {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
  const cryptoImplementation = dependencies.crypto ?? globalThis.crypto;
  if (typeof fetchImplementation !== "function" || !cryptoImplementation?.subtle) {
    return tokenError();
  }

  const assertion = await createAssertion(env, assertionTimeMilliseconds, cryptoImplementation);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetchImplementation(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    return tokenError();
  }

  const responseBody: unknown = await response.json();
  if (!isTokenResponse(responseBody)) {
    return tokenError();
  }

  const responseTimeMilliseconds = now();
  const expiresAtMilliseconds =
    responseTimeMilliseconds +
    Math.max(0, responseBody.expires_in * 1000 - ACCESS_TOKEN_EXPIRY_SAFETY_MILLISECONDS);
  if (
    !Number.isSafeInteger(responseTimeMilliseconds) ||
    responseTimeMilliseconds < 0 ||
    !Number.isSafeInteger(expiresAtMilliseconds)
  ) {
    return tokenError();
  }

  cache.accessToken = responseBody.access_token;
  cache.expiresAtMilliseconds = expiresAtMilliseconds;
  return responseBody.access_token;
}

export async function getGoogleAccessToken(
  env: ServiceAccountEnv,
  cache: GoogleAccessTokenCache,
  now: () => number = Date.now,
  dependencies: ServiceAccountAuthDependencies = {},
): Promise<string> {
  try {
    const nowMilliseconds = now();
    if (!Number.isSafeInteger(nowMilliseconds) || nowMilliseconds < 0 || !cache) {
      return tokenError();
    }
    if (
      isBearerToken(cache.accessToken) &&
      typeof cache.expiresAtMilliseconds === "number" &&
      Number.isSafeInteger(cache.expiresAtMilliseconds) &&
      cache.expiresAtMilliseconds > nowMilliseconds
    ) {
      return cache.accessToken;
    }
    if (cache.refreshPromise) {
      return await cache.refreshPromise;
    }

    const refreshPromise = refreshGoogleAccessToken(
      env,
      cache,
      now,
      dependencies,
      nowMilliseconds,
    );
    cache.refreshPromise = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      if (cache.refreshPromise === refreshPromise) {
        delete cache.refreshPromise;
      }
    }
  } catch {
    return tokenError();
  }
}
