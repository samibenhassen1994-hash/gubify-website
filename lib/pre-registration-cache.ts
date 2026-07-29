import { calculateBetaProgress } from "./pre-registration";

const CACHE_TTL_MS = 45_000;

let cachedProgress: ReturnType<typeof calculateBetaProgress> | null = null;
let cachedAt = 0;

export function readCachedProgress() {
  if (!cachedProgress || Date.now() - cachedAt >= CACHE_TTL_MS) return null;
  return cachedProgress;
}

export function writeCachedProgress(count: number) {
  cachedProgress = calculateBetaProgress(count);
  cachedAt = Date.now();
  return cachedProgress;
}

export function clearProgressCache() {
  cachedProgress = null;
  cachedAt = 0;
}
