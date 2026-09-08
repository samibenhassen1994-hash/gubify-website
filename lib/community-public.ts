import { env } from "cloudflare:workers";

const FIRESTORE_ORIGIN = "https://firestore.googleapis.com";
const COMMUNITY_PUBLIC_COLLECTION = "communityPublic";
const COMMUNITY_FIELD_PATHS = [
  "slug",
  "name",
  "description",
  "language",
  "accessMode",
  "imageUrl",
  "createdAt",
  "updatedAt",
] as const;

const COMMUNITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

type RuntimeEnv = {
  FIREBASE_PROJECT_ID?: string;
};

type FirestoreValue = {
  stringValue?: unknown;
  timestampValue?: unknown;
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type PublicCommunity = {
  slug: string;
  name: string;
  description: string;
  language: string;
  accessMode: "open" | "approval";
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicCommunityReadResult =
  | { status: "found"; community: PublicCommunity }
  | { status: "not-found" }
  | { status: "upstream-failure" };

type PublicCommunityReadOptions = {
  projectId?: string;
  fetcher?: Fetcher;
};

export function validateCommunitySlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length >= 1 &&
    slug.length <= 60 &&
    COMMUNITY_SLUG_PATTERN.test(slug)
  );
}

function readString(
  fields: Record<string, FirestoreValue>,
  key: string,
): string | null {
  const value = fields[key]?.stringValue;
  return typeof value === "string" ? value : null;
}

function readTimestamp(
  fields: Record<string, FirestoreValue>,
  key: string,
): string | null {
  const value = fields[key]?.timestampValue;
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function mapFirestoreDocument(
  document: FirestoreDocument,
  requestedSlug: string,
): PublicCommunity | null {
  const fields = document.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return null;
  }

  const slug = readString(fields, "slug");
  const name = readString(fields, "name");
  const description = readString(fields, "description");
  const language = readString(fields, "language");
  const accessMode = readString(fields, "accessMode");
  const createdAt = readTimestamp(fields, "createdAt");
  const updatedAt = readTimestamp(fields, "updatedAt");

  if (
    slug !== requestedSlug ||
    !name ||
    description === null ||
    !language ||
    (accessMode !== "open" && accessMode !== "approval") ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  let imageUrl: string | null = null;
  if (fields.imageUrl !== undefined) {
    imageUrl = readString(fields, "imageUrl");
    if (!imageUrl) return null;

    try {
      if (new URL(imageUrl).protocol !== "https:") return null;
    } catch {
      return null;
    }
  }

  return {
    slug,
    name,
    description,
    language,
    accessMode,
    imageUrl,
    createdAt,
    updatedAt,
  };
}

export async function fetchPublicCommunityBySlug(
  slug: unknown,
  options: PublicCommunityReadOptions = {},
): Promise<PublicCommunityReadResult> {
  if (!validateCommunitySlug(slug)) return { status: "not-found" };

  const runtime = env as unknown as RuntimeEnv;
  const projectId = options.projectId ?? runtime.FIREBASE_PROJECT_ID;
  if (!projectId || !FIREBASE_PROJECT_ID_PATTERN.test(projectId)) {
    return { status: "upstream-failure" };
  }

  const url = new URL(
    `/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${COMMUNITY_PUBLIC_COLLECTION}/${encodeURIComponent(slug)}`,
    FIRESTORE_ORIGIN,
  );
  for (const fieldPath of COMMUNITY_FIELD_PATHS) {
    url.searchParams.append("mask.fieldPaths", fieldPath);
  }

  try {
    const response = await (options.fetcher ?? fetch)(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
    });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "upstream-failure" };

    const community = mapFirestoreDocument(
      (await response.json()) as FirestoreDocument,
      slug,
    );
    return community
      ? { status: "found", community }
      : { status: "upstream-failure" };
  } catch {
    return { status: "upstream-failure" };
  }
}
