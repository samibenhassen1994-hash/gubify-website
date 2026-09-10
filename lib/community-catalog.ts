import { env } from "cloudflare:workers";

import { validateCommunitySlug } from "./community-public";

const FIRESTORE_ORIGIN = "https://firestore.googleapis.com";
const COMMUNITY_PUBLIC_COLLECTION = "communityPublic";
const QUERY_LIMIT = 100;
const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

const COMMUNITY_TYPES = [
  "General",
  "Gaming",
  "Sport",
  "Music",
  "Study",
  "Travel",
  "Show",
  "Work",
  "Social",
  "Events",
  "Hobbies & Interests",
  "Technology",
  "Art & Creativity",
  "Movies & TV",
  "Books & Reading",
  "Food & Cooking",
  "Fitness & Wellness",
  "Other",
  "Friends",
  "Local",
] as const;

const COMMUNITY_TYPE_SET = new Set<string>(COMMUNITY_TYPES);

type RuntimeEnv = {
  FIREBASE_PROJECT_ID?: string;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type FirestoreValue = {
  stringValue?: unknown;
  integerValue?: unknown;
  timestampValue?: unknown;
};

type RunQueryResponse = {
  document?: {
    name?: unknown;
    fields?: unknown;
  };
  transaction?: unknown;
  readTime?: unknown;
  skippedResults?: unknown;
  done?: unknown;
  explainMetrics?: unknown;
};

export type PublicCommunityCatalogItem = {
  slug: string;
  name: string;
  description: string;
  type?: (typeof COMMUNITY_TYPES)[number];
  language: string;
  accessMode: "open" | "approval";
  memberCount?: number;
  imageUrl: string | null;
  createdAt: string;
};

type CommunityCatalogReadOptions = {
  projectId?: string;
  fetcher?: Fetcher;
};

type ParsedPage = {
  communities: PublicCommunityCatalogItem[];
  documentCount: number;
  lastDocumentName: string | null;
};

function malformedResponse(): never {
  throw new Error("Firestore returned a malformed Community catalog response.");
}

function parseFirestoreTimestamp(value: unknown): string | null {
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
    !validZone ||
    !Number.isFinite(new Date(value).getTime())
  ) {
    return null;
  }

  return value;
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
  return !(
    "explainMetrics" in item &&
    (!item.explainMetrics || typeof item.explainMetrics !== "object")
  );
}

function readString(
  fields: Record<string, FirestoreValue>,
  key: string,
): string | null {
  const value = fields[key]?.stringValue;
  return typeof value === "string" ? value : null;
}

function parseMemberCount(
  fields: Record<string, FirestoreValue>,
): { valid: true; value?: number } | { valid: false } {
  if (fields.memberCount === undefined) return { valid: true };
  const value = fields.memberCount.integerValue;
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9]\d*)$/.test(value)
  ) {
    return { valid: false };
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? { valid: true, value: parsed }
    : { valid: false };
}

function parseHttpsImageUrl(
  fields: Record<string, FirestoreValue>,
): string | null {
  if (fields.imageUrl === undefined) return null;
  const imageUrl = readString(fields, "imageUrl");
  if (!imageUrl) return null;
  try {
    return new URL(imageUrl).protocol === "https:" ? imageUrl : null;
  } catch {
    return null;
  }
}

function mapFirestoreDocument(
  fields: Record<string, FirestoreValue>,
  documentSlug: string,
): PublicCommunityCatalogItem | null {
  const slug = readString(fields, "slug");
  const name = readString(fields, "name");
  const description = readString(fields, "description");
  const language = readString(fields, "language");
  const accessMode = readString(fields, "accessMode");
  const createdAt = parseFirestoreTimestamp(fields.createdAt?.timestampValue);
  const memberCount = parseMemberCount(fields);

  if (
    slug !== documentSlug ||
    !name ||
    description === null ||
    !language ||
    (accessMode !== "open" && accessMode !== "approval") ||
    !createdAt ||
    !memberCount.valid
  ) {
    return null;
  }

  const rawType = fields.type === undefined ? undefined : readString(fields, "type");
  if (fields.type !== undefined && rawType === null) return null;
  const typeValue = rawType && COMMUNITY_TYPE_SET.has(rawType) ? rawType : null;

  return {
    slug,
    name,
    description,
    ...(typeValue
      ? { type: typeValue as PublicCommunityCatalogItem["type"] }
      : {}),
    language,
    accessMode,
    ...(memberCount.value === undefined ? {} : { memberCount: memberCount.value }),
    imageUrl: parseHttpsImageUrl(fields),
    createdAt,
  };
}

function parsePage(value: unknown, projectId: string): ParsedPage {
  if (!Array.isArray(value) || value.length === 0) malformedResponse();

  const documentPrefix = `projects/${projectId}/databases/(default)/documents/${COMMUNITY_PUBLIC_COLLECTION}/`;
  const communities: PublicCommunityCatalogItem[] = [];
  let documentCount = 0;
  let lastDocumentName: string | null = null;

  for (const item of value) {
    if (!item || typeof item !== "object") malformedResponse();
    const response = item as RunQueryResponse;
    if (!("document" in response)) {
      if (!isValidNonDocumentResponse(response)) malformedResponse();
      continue;
    }

    const document = response.document;
    const name = document?.name;
    if (typeof name !== "string" || !name.startsWith(documentPrefix)) {
      malformedResponse();
    }
    const documentSlug = name.slice(documentPrefix.length);
    if (!validateCommunitySlug(documentSlug)) malformedResponse();

    documentCount += 1;
    lastDocumentName = name;
    const fields = document?.fields;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
    const community = mapFirestoreDocument(
      fields as Record<string, FirestoreValue>,
      documentSlug,
    );
    if (community) communities.push(community);
  }

  return { communities, documentCount, lastDocumentName };
}

export async function fetchPublicCommunityCatalog(
  options: CommunityCatalogReadOptions = {},
): Promise<PublicCommunityCatalogItem[]> {
  const runtime = env as unknown as RuntimeEnv;
  const projectId = options.projectId ?? runtime.FIREBASE_PROJECT_ID;
  if (!projectId || !FIREBASE_PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error("Firestore project configuration is unavailable.");
  }

  const endpoint = new URL(
    `/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`,
    FIRESTORE_ORIGIN,
  );
  const fetcher = options.fetcher ?? fetch;
  const communities: PublicCommunityCatalogItem[] = [];
  const seenSlugs = new Set<string>();
  let cursor: string | undefined;

  for (;;) {
    const structuredQuery = {
      select: {
        fields: [
          { fieldPath: "slug" },
          { fieldPath: "name" },
          { fieldPath: "description" },
          { fieldPath: "type" },
          { fieldPath: "language" },
          { fieldPath: "accessMode" },
          { fieldPath: "memberCount" },
          { fieldPath: "imageUrl" },
          { fieldPath: "createdAt" },
        ],
      },
      from: [{ collectionId: COMMUNITY_PUBLIC_COLLECTION }],
      orderBy: [
        { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
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
        redirect: "manual",
      });
    } catch (error) {
      throw new Error("Firestore Community catalog query failed.", { cause: error });
    }

    if (!response.ok) {
      throw new Error(
        `Firestore Community catalog query failed with status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("Firestore returned a malformed Community catalog response.", {
        cause: error,
      });
    }

    const page = parsePage(payload, projectId);
    for (const community of page.communities) {
      if (seenSlugs.has(community.slug)) malformedResponse();
      seenSlugs.add(community.slug);
      communities.push(community);
    }

    if (page.documentCount < QUERY_LIMIT) return communities;
    if (!page.lastDocumentName) malformedResponse();
    cursor = page.lastDocumentName;
  }
}
