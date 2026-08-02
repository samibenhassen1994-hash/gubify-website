export type PreRegistrationProgress = {
  count: number;
  goal: number;
  remaining: number;
  percentage: number;
  goalReached: boolean;
};

type FetchProgressOptions = {
  fresh?: boolean;
  fetcher?: typeof fetch;
  now?: () => number;
};

export async function fetchPreRegistrationProgress({
  fresh = false,
  fetcher = fetch,
  now = Date.now,
}: FetchProgressOptions = {}) {
  const url = fresh
    ? `/api/pre-register/count?refresh=${now()}`
    : "/api/pre-register/count";
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    ...(fresh ? { cache: "no-store" as const } : {}),
  });
  if (!response.ok) throw new Error("Counter unavailable");
  return (await response.json()) as PreRegistrationProgress;
}
