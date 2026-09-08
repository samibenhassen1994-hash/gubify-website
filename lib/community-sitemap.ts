import { env } from "cloudflare:workers";

import { validateCommunitySlug } from "./community-public";

const FIRESTORE_ORIGIN = "https://firestore.googleapis.com";
const COMMUNITY_PUBLIC_COLLECTION = "communityPublic";
const QUERY_LIMIT = 100;
const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

type RuntimeEnv = {
  FIREBASE_PROJECT_ID?: string;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type FirestoreValue = {
  stringValue?: unknown;
  timestampValue?: unknown;
};

type RunQueryResponse = {
  transaction?: unknown;
  document?: {
    name?: unknown;
    fields?: Record<string, FirestoreValue>;
  };
  readTime?: unknown;
  skippedResults?: unknown;
  done?: unknown;
  explainMetrics?: unknown;
};

export type CommunitySitemapEntry = {
  slug: string;
  updatedAt: Date;
};

type CommunitySitemapReadOptions = {
  projectId?: string;
  fetcher?: Fetcher;
};

function malformedResponse(): never {
  throw new Error("Firestore returned a malformed Community sitemap response.");
}

function serializeCaughtError(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
} {
  const fallbackMessage = (() => {
    try {
      return String(error);
    } catch {
      return "[unserializable thrown value]";
    }
  })();

  try {
    if (error && (typeof error === "object" || typeof error === "function")) {
      const candidate = error as { name?: unknown; message?: unknown; stack?: unknown };
      return {
        name: typeof candidate.name === "string" ? candidate.name : "NonErrorThrown",
        message:
          typeof candidate.message === "string" ? candidate.message : fallbackMessage,
        stack: typeof candidate.stack === "string" ? candidate.stack : null,
      };
    }
  } catch {
    // Fall through to the safe scalar representation below.
  }

  return {
    name: "NonErrorThrown",
    message: fallbackMessage,
    stack: null,
  };
}

function parseFirestoreTimestamp(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}|\d{6}|\d{9}))?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const validZone =
    zone === "Z" ||
    (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4, 6)) <= 59);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    !validZone
  ) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) ? timestamp : null;
}

function isValidNonDocumentResponse(item: RunQueryResponse): boolean {
  const allowedKeys = new Set([
    "transaction",
    "readTime",
    "skippedResults",
    "done",
    "explainMetrics",
  ]);
  const keys = Object.keys(item);
  if (keys.length === 0 || keys.some((key) => !allowedKeys.has(key))) return false;
  if ("transaction" in item && typeof item.transaction !== "string") return false;
  if ("readTime" in item && !parseFirestoreTimestamp(item.readTime)) return false;
  if (
    "skippedResults" in item &&
    (!Number.isInteger(item.skippedResults) || Number(item.skippedResults) < 0)
  ) {
    return false;
  }
  if ("done" in item && typeof item.done !== "boolean") return false;
  if (
    "explainMetrics" in item &&
    (!item.explainMetrics || typeof item.explainMetrics !== "object")
  ) {
    return false;
  }
  return true;
}

function parsePage(
  value: unknown,
  projectId: string,
): Array<CommunitySitemapEntry & { documentName: string }> {
  if (!Array.isArray(value) || value.length === 0) malformedResponse();

  const documentPrefix = `projects/${projectId}/databases/(default)/documents/${COMMUNITY_PUBLIC_COLLECTION}/`;
  const documents: Array<CommunitySitemapEntry & { documentName: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") malformedResponse();
    const response = item as RunQueryResponse;
    if (!("document" in response)) {
      if (!isValidNonDocumentResponse(response)) malformedResponse();
      continue;
    }

    const { document } = response;
    const name = document?.name;
    const fields = document?.fields;
    const slug = fields?.slug?.stringValue;
    const updatedAtValue = fields?.updatedAt?.timestampValue;
    const updatedAt = parseFirestoreTimestamp(updatedAtValue);

    if (
      typeof name !== "string" ||
      typeof slug !== "string" ||
      !validateCommunitySlug(slug) ||
      name !== `${documentPrefix}${slug}` ||
      !updatedAt
    ) {
      malformedResponse();
    }

    documents.push({
      slug,
      updatedAt,
      documentName: name,
    });
  }
  return documents;
}

export async function fetchCommunitySitemapEntries(
  options: CommunitySitemapReadOptions = {},
): Promise<CommunitySitemapEntry[]> {
  const runtime = env as unknown as RuntimeEnv;
  const projectId = options.projectId ?? runtime.FIREBASE_PROJECT_ID;
  if (!projectId || !FIREBASE_PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error("Firestore project configuration is unavailable.");
  }

  const fetcher = options.fetcher ?? fetch;
  const endpoint = new URL(
    `/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`,
    FIRESTORE_ORIGIN,
  );
  const communities: CommunitySitemapEntry[] = [];
  const seenSlugs = new Set<string>();
  let cursor: string | undefined;

  for (;;) {
    const structuredQuery = {
      select: {
        fields: [{ fieldPath: "slug" }, { fieldPath: "updatedAt" }],
      },
      from: [{ collectionId: COMMUNITY_PUBLIC_COLLECTION }],
      orderBy: [
        {
          field: { fieldPath: "__name__" },
          direction: "ASCENDING",
        },
      ],
      limit: QUERY_LIMIT,
      ...(cursor
        ? {
            startAt: {
              values: [{ referenceValue: cursor }],
              before: false,
            },
          }
        : {}),
    };

    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ structuredQuery }),
        redirect: "error",
      });
    } catch (error) {
      console.error({
        diagnosticTag: "community-sitemap-firestore-fetch",
        target: "firestore.googleapis.com",
        error: serializeCaughtError(error),
      });
      throw new Error("Firestore Community sitemap query failed.", {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new Error(
        `Firestore Community sitemap query failed with status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("Firestore returned a malformed Community sitemap response.", {
        cause: error,
      });
    }

    const page = parsePage(payload, projectId);
    for (const entry of page) {
      if (seenSlugs.has(entry.slug)) malformedResponse();
      seenSlugs.add(entry.slug);
      communities.push({ slug: entry.slug, updatedAt: entry.updatedAt });
    }

    if (page.length < QUERY_LIMIT) return communities;
    cursor = page.at(-1)?.documentName;
    if (!cursor) malformedResponse();
  }
}
