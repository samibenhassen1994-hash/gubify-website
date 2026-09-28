export interface PushRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export async function hashRateLimitIdentity(
  scope: "ip" | "uid",
  identity: string,
  cryptoImplementation: Crypto = globalThis.crypto,
): Promise<string> {
  const digest = await cryptoImplementation.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${scope}:${identity}`),
  );
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${scope}:${hex}`;
}

export async function isRateLimitAllowed(
  limiter: PushRateLimiter,
  key: string,
): Promise<boolean> {
  const result = await limiter.limit({ key });
  return result.success === true;
}
