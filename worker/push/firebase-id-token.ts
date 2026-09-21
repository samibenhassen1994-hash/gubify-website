export const FIREBASE_CERTIFICATE_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
export const FIREBASE_TOKEN_CLOCK_SKEW_SECONDS = 300;
const FIREBASE_SUBJECT_MAX_LENGTH = 128;
const CACHE_EXPIRY_HEADER = "X-Gubify-Certificates-Expires-At";

export interface FirebaseIdTokenClaims extends Record<string, unknown> {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  auth_time: number;
}

export interface VerifiedFirebaseUser {
  uid: string;
  claims: FirebaseIdTokenClaims;
}

type CertificateCache = Pick<Cache, "match" | "put">;

export interface FirebaseTokenVerificationOptions {
  cache?: CertificateCache;
  fetch?: typeof fetch;
  crypto?: Crypto;
  now?: () => number;
}

export class FirebaseTokenVerificationError extends Error {
  constructor() {
    super("Invalid Firebase ID token");
    this.name = "FirebaseTokenVerificationError";
  }
}

interface CertificateSet {
  certificates: Record<string, string>;
  source: "cache" | "network";
}

function invalidToken(): never {
  throw new FirebaseTokenVerificationError();
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return invalidToken();
  }
  const paddingLength = (4 - (value.length % 4)) % 4;
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(paddingLength);
  try {
    const decoded = atob(normalized);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return invalidToken();
  }
}

function decodeJsonPart(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return invalidToken();
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof FirebaseTokenVerificationError) {
      throw error;
    }
    return invalidToken();
  }
}

function parseMaxAge(cacheControl: string | null): number {
  const match = cacheControl?.match(/(?:^|,)\s*max-age\s*=\s*(\d+)\s*(?:,|$)/i);
  if (!match) {
    return 0;
  }
  const maxAge = Number(match[1]);
  return Number.isSafeInteger(maxAge) && maxAge > 0 ? maxAge : 0;
}

function parseAge(ageHeader: string | null): number {
  if (!ageHeader || !/^\d+$/.test(ageHeader.trim())) {
    return 0;
  }
  const age = Number(ageHeader);
  return Number.isSafeInteger(age) && age >= 0 ? age : 0;
}

function remainingFreshnessSeconds(headers: Headers, nowMilliseconds: number): number {
  const maxAge = parseMaxAge(headers.get("Cache-Control"));
  if (maxAge === 0) {
    return 0;
  }

  const ageSeconds = parseAge(headers.get("Age"));
  const dateMilliseconds = Date.parse(headers.get("Date") ?? "");
  const apparentAgeSeconds = Number.isFinite(dateMilliseconds)
    ? Math.max(0, (nowMilliseconds - dateMilliseconds) / 1000)
    : 0;
  const currentAgeSeconds = Math.max(ageSeconds, apparentAgeSeconds);
  return Math.max(0, Math.floor(maxAge - currentAgeSeconds));
}

function isCertificateMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((certificate) => typeof certificate === "string" && certificate.length > 0)
  );
}

function defaultCertificateCache(): CertificateCache | undefined {
  if (typeof caches === "undefined") {
    return undefined;
  }
  return (caches as CacheStorage & { default?: Cache }).default;
}

async function fetchCertificates(
  options: Required<Pick<FirebaseTokenVerificationOptions, "fetch" | "now">> & {
    cache?: CertificateCache;
  },
  forceRefresh: boolean,
): Promise<CertificateSet> {
  const cacheKey = new Request(FIREBASE_CERTIFICATE_URL);
  if (!forceRefresh && options.cache) {
    const cached = await options.cache.match(cacheKey);
    if (cached) {
      const expiresAt = Number(cached.headers.get(CACHE_EXPIRY_HEADER));
      if (Number.isFinite(expiresAt) && expiresAt > options.now()) {
        const certificates: unknown = await cached.json();
        if (isCertificateMap(certificates)) {
          return { certificates, source: "cache" };
        }
      }
    }
  }

  const response = await options.fetch(FIREBASE_CERTIFICATE_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return invalidToken();
  }
  const certificates: unknown = await response.json();
  if (!isCertificateMap(certificates)) {
    return invalidToken();
  }

  const nowMilliseconds = options.now();
  const cacheSeconds = remainingFreshnessSeconds(response.headers, nowMilliseconds);
  if (options.cache && cacheSeconds > 0) {
    const headers = new Headers({
      "Cache-Control": `public, max-age=${cacheSeconds}`,
      "Content-Type": "application/json",
      [CACHE_EXPIRY_HEADER]: String(nowMilliseconds + cacheSeconds * 1000),
    });
    await options.cache.put(cacheKey, Response.json(certificates, { headers }));
  }
  return { certificates, source: "network" };
}

interface DerElement {
  start: number;
  valueStart: number;
  next: number;
  tag: number;
}

function readDerElement(bytes: Uint8Array, start: number): DerElement {
  if (start + 2 > bytes.length) {
    return invalidToken();
  }
  const tag = bytes[start];
  const firstLength = bytes[start + 1];
  let length = firstLength;
  let valueStart = start + 2;
  if ((firstLength & 0x80) !== 0) {
    const lengthBytes = firstLength & 0x7f;
    if (lengthBytes === 0 || lengthBytes > 4 || valueStart + lengthBytes > bytes.length) {
      return invalidToken();
    }
    length = 0;
    for (let index = 0; index < lengthBytes; index += 1) {
      length = length * 256 + bytes[valueStart + index];
    }
    valueStart += lengthBytes;
  }
  const next = valueStart + length;
  if (next > bytes.length) {
    return invalidToken();
  }
  return { start, valueStart, next, tag };
}

function extractSubjectPublicKeyInfo(certificate: Uint8Array): Uint8Array {
  const outer = readDerElement(certificate, 0);
  if (outer.tag !== 0x30 || outer.next !== certificate.length) {
    return invalidToken();
  }
  const tbs = readDerElement(certificate, outer.valueStart);
  if (tbs.tag !== 0x30) {
    return invalidToken();
  }

  let cursor = tbs.valueStart;
  let element = readDerElement(certificate, cursor);
  if (element.tag === 0xa0) {
    cursor = element.next;
  }
  // serialNumber, signature, issuer, validity, subject
  for (let index = 0; index < 5; index += 1) {
    element = readDerElement(certificate, cursor);
    cursor = element.next;
  }
  const subjectPublicKeyInfo = readDerElement(certificate, cursor);
  if (subjectPublicKeyInfo.tag !== 0x30) {
    return invalidToken();
  }
  return certificate.slice(subjectPublicKeyInfo.start, subjectPublicKeyInfo.next);
}

function pemToSubjectPublicKeyInfo(pem: string): Uint8Array {
  const certificateMatch = pem.match(
    /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/,
  );
  const publicKeyMatch = pem.match(
    /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/,
  );
  const match = certificateMatch ?? publicKeyMatch;
  if (!match) {
    return invalidToken();
  }
  let der: Uint8Array;
  try {
    const decoded = atob(match[1].replace(/\s/g, ""));
    der = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return invalidToken();
  }
  return certificateMatch ? extractSubjectPublicKeyInfo(der) : der;
}

function validateClaims(
  claims: Record<string, unknown>,
  projectId: string,
  nowSeconds: number,
): FirebaseIdTokenClaims {
  if (
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    claims.aud !== projectId ||
    typeof claims.sub !== "string" ||
    claims.sub.length === 0 ||
    claims.sub.length > FIREBASE_SUBJECT_MAX_LENGTH ||
    typeof claims.exp !== "number" ||
    !Number.isFinite(claims.exp) ||
    claims.exp < nowSeconds - FIREBASE_TOKEN_CLOCK_SKEW_SECONDS ||
    typeof claims.iat !== "number" ||
    !Number.isFinite(claims.iat) ||
    claims.iat < 0 ||
    claims.iat > nowSeconds + FIREBASE_TOKEN_CLOCK_SKEW_SECONDS ||
    typeof claims.auth_time !== "number" ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time < 0 ||
    claims.auth_time > nowSeconds + FIREBASE_TOKEN_CLOCK_SKEW_SECONDS
  ) {
    return invalidToken();
  }
  return claims as FirebaseIdTokenClaims;
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  providedOptions: FirebaseTokenVerificationOptions = {},
): Promise<VerifiedFirebaseUser> {
  if (!projectId || typeof token !== "string") {
    return invalidToken();
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return invalidToken();
  }

  const header = decodeJsonPart(parts[0]);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length === 0) {
    return invalidToken();
  }
  const claims = decodeJsonPart(parts[1]);
  const cryptoImplementation = providedOptions.crypto ?? globalThis.crypto;
  const options = {
    cache: providedOptions.cache ?? defaultCertificateCache(),
    fetch: providedOptions.fetch ?? globalThis.fetch,
    now: providedOptions.now ?? Date.now,
  };
  if (!cryptoImplementation?.subtle || typeof options.fetch !== "function") {
    return invalidToken();
  }

  let certificateSet = await fetchCertificates(options, false);
  let certificate = certificateSet.certificates[header.kid];
  if (!certificate && certificateSet.source === "cache") {
    certificateSet = await fetchCertificates(options, true);
    certificate = certificateSet.certificates[header.kid];
  }
  if (!certificate) {
    return invalidToken();
  }

  let publicKey: CryptoKey;
  try {
    publicKey = await cryptoImplementation.subtle.importKey(
      "spki",
      pemToSubjectPublicKeyInfo(certificate),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch (error) {
    if (error instanceof FirebaseTokenVerificationError) {
      throw error;
    }
    return invalidToken();
  }

  const signatureValid = await cryptoImplementation.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!signatureValid) {
    return invalidToken();
  }

  const validatedClaims = validateClaims(claims, projectId, options.now() / 1000);
  return { uid: validatedClaims.sub, claims: validatedClaims };
}
