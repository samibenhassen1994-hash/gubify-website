import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !specifier.match(/\.[cm]?[jt]sx?$/)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { fetchPublicCommunityCatalog } = await import("../lib/community-catalog.ts");
const { GET: getCommunityCatalog } = await import("../app/api/communities/route.ts");

const projectId = "gubify-a3e2c";
const pageSize = 100;

function publicCommunity(index, overrides = {}) {
  const slug = `community-${String(index).padStart(4, "0")}`;
  return {
    slug,
    name: `Community ${index}`,
    description: `Description ${index}`,
    type: "Gaming",
    language: "English",
    accessMode: "open",
    memberCount: String(index),
    imageUrl: `https://images.example.test/${slug}.jpg`,
    createdAt: `2026-09-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    ...overrides,
  };
}

function runQueryDocument(entry) {
  const fields = {
    slug: { stringValue: entry.slug },
    name: { stringValue: entry.name },
    description: { stringValue: entry.description },
    ...(entry.type === undefined ? {} : { type: { stringValue: entry.type } }),
    language: { stringValue: entry.language },
    accessMode: { stringValue: entry.accessMode },
    ...(entry.memberCount === undefined
      ? {}
      : { memberCount: { integerValue: entry.memberCount } }),
    ...(entry.imageUrl === undefined
      ? {}
      : { imageUrl: { stringValue: entry.imageUrl } }),
    createdAt: { timestampValue: entry.createdAt },
    ownerId: { stringValue: "must-not-leak" },
    memberEmails: { arrayValue: { values: [{ stringValue: "private@example.test" }] } },
  };

  return {
    document: {
      name: `projects/${projectId}/databases/(default)/documents/communityPublic/${entry.slug}`,
      fields,
    },
    readTime: "2026-09-08T12:00:00.000Z",
  };
}

function paginatedFirestore(entries) {
  const requests = [];
  return {
    requests,
    fetcher: async (input, init) => {
      const body = JSON.parse(String(init?.body));
      requests.push({ url: String(input), init, body });
      const cursor = body.structuredQuery.startAt?.values?.[0]?.referenceValue;
      const cursorSlug = cursor?.split("/").at(-1);
      const start = cursorSlug
        ? entries.findIndex((entry) => entry.slug === cursorSlug) + 1
        : 0;
      const page = entries.slice(start, start + pageSize);
      return Response.json(
        page.length > 0
          ? [
              ...page.map(runQueryDocument),
              { readTime: "2026-09-08T12:00:00.000Z", done: true },
            ]
          : [{ readTime: "2026-09-08T12:00:00.000Z" }],
      );
    },
  };
}

function assertBoundedCatalogQueries(requests) {
  for (const [index, request] of requests.entries()) {
    assert.equal(
      request.url,
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    );
    assert.equal(request.init?.method, "POST");
    assert.equal(request.init?.redirect, "manual");
    assert.equal(request.body.structuredQuery.limit, 100);
    assert.equal(Object.hasOwn(request.body.structuredQuery, "offset"), false);
    assert.deepEqual(request.body.structuredQuery.select.fields, [
      { fieldPath: "slug" },
      { fieldPath: "name" },
      { fieldPath: "description" },
      { fieldPath: "type" },
      { fieldPath: "language" },
      { fieldPath: "accessMode" },
      { fieldPath: "memberCount" },
      { fieldPath: "imageUrl" },
      { fieldPath: "createdAt" },
    ]);
    assert.deepEqual(request.body.structuredQuery.orderBy, [
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ]);
    if (index === 0) {
      assert.equal(request.body.structuredQuery.startAt, undefined);
    } else {
      assert.equal(request.body.structuredQuery.startAt.before, false);
      assert.match(
        request.body.structuredQuery.startAt.values[0].referenceValue,
        /\/documents\/communityPublic\/community-\d{4}$/,
      );
    }
  }
}

for (const [total, expectedQueries] of [
  [0, 1],
  [99, 1],
  [100, 2],
  [101, 2],
  [200, 3],
  [201, 3],
]) {
  test(`reads ${total} Communities through bounded Firestore pages`, async () => {
    const entries = Array.from({ length: total }, (_, index) =>
      publicCommunity(index + 1),
    );
    const firestore = paginatedFirestore(entries);
    const result = await fetchPublicCommunityCatalog({
      projectId,
      fetcher: firestore.fetcher,
    });

    assert.equal(firestore.requests.length, expectedQueries);
    assert.equal(result.length, total);
    assert.deepEqual(result.map((community) => community.slug), entries.map((entry) => entry.slug));
    assertBoundedCatalogQueries(firestore.requests);
  });
}

test("maps only the whitelisted public catalog fields", async () => {
  const firestore = paginatedFirestore([publicCommunity(1)]);
  const [community] = await fetchPublicCommunityCatalog({
    projectId,
    fetcher: firestore.fetcher,
  });

  assert.deepEqual(community, {
    slug: "community-0001",
    name: "Community 1",
    description: "Description 1",
    type: "Gaming",
    language: "English",
    accessMode: "open",
    memberCount: 1,
    imageUrl: "https://images.example.test/community-0001.jpg",
    createdAt: "2026-09-02T12:00:00.000Z",
  });
  assert.equal(Object.hasOwn(community, "communityId"), false);
  assert.equal(Object.hasOwn(community, "updatedAt"), false);
  assert.equal(Object.hasOwn(community, "imageVersion"), false);
  assert.equal(Object.hasOwn(community, "ownerId"), false);
  assert.equal(Object.hasOwn(community, "memberEmails"), false);
});

test("the catalog API serializes only the explicit public whitelist", async () => {
  const firestore = paginatedFirestore([publicCommunity(1)]);
  const originalFetch = globalThis.fetch;
  const originalEnv = globalThis.__cloudflareTestEnv;
  globalThis.__cloudflareTestEnv = { FIREBASE_PROJECT_ID: projectId };
  globalThis.fetch = firestore.fetcher;

  try {
    const response = await getCommunityCatalog();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      communities: [
        {
          slug: "community-0001",
          name: "Community 1",
          description: "Description 1",
          type: "Gaming",
          language: "English",
          accessMode: "open",
          memberCount: 1,
          imageUrl: "https://images.example.test/community-0001.jpg",
          createdAt: "2026-09-02T12:00:00.000Z",
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.__cloudflareTestEnv = originalEnv;
  }
});

test("keeps legacy Communities with missing optional type and memberCount", async () => {
  const firestore = paginatedFirestore([
    publicCommunity(1, { type: undefined, memberCount: undefined, imageUrl: undefined }),
  ]);
  const [community] = await fetchPublicCommunityCatalog({
    projectId,
    fetcher: firestore.fetcher,
  });

  assert.deepEqual(community, {
    slug: "community-0001",
    name: "Community 1",
    description: "Description 1",
    language: "English",
    accessMode: "open",
    imageUrl: null,
    createdAt: "2026-09-02T12:00:00.000Z",
  });
});

test("keeps a Community with an unknown future type without exposing that type", async () => {
  const firestore = paginatedFirestore([
    publicCommunity(1, { type: "Future Category" }),
  ]);
  const [community] = await fetchPublicCommunityCatalog({
    projectId,
    fetcher: firestore.fetcher,
  });

  assert.ok(community);
  assert.equal(community.slug, "community-0001");
  assert.equal(Object.hasOwn(community, "type"), false);
});

test("accepts open and approval access modes plus HTTPS image URLs", async () => {
  const firestore = paginatedFirestore([
    publicCommunity(1, { accessMode: "approval", type: "Friends" }),
    publicCommunity(2, { type: "Local", imageUrl: "http://invalid.example.test/image.jpg" }),
  ]);
  const result = await fetchPublicCommunityCatalog({
    projectId,
    fetcher: firestore.fetcher,
  });

  assert.equal(result[0].accessMode, "approval");
  assert.equal(result[0].type, "Friends");
  assert.equal(result[1].type, "Local");
  assert.equal(result[1].imageUrl, null);
});

test("skips malformed memberCount documents while continuing with the Firestore document cursor", async () => {
  for (const invalidMemberCount of ["-1", "1.5", "9007199254740992"]) {
    const entries = Array.from({ length: 101 }, (_, index) =>
      publicCommunity(index + 1),
    );
    entries[0] = publicCommunity(1, { memberCount: invalidMemberCount });
    const firestore = paginatedFirestore(entries);
    const result = await fetchPublicCommunityCatalog({
      projectId,
      fetcher: firestore.fetcher,
    });

    assert.equal(result.length, 100);
    assert.equal(result.some((community) => community.slug === "community-0001"), false);
    assert.equal(firestore.requests.length, 2);
    assert.match(
      firestore.requests[1].body.structuredQuery.startAt.values[0].referenceValue,
      /\/documents\/communityPublic\/community-0100$/,
    );
  }
});

test("rejects malformed envelopes and upstream errors instead of returning an empty catalog", async () => {
  for (const fetcher of [
    async () => Response.json([]),
    async () => Response.json([{ done: "yes" }]),
    async () => new Response(null, { status: 503 }),
    async () => { throw new Error("network unavailable"); },
  ]) {
    await assert.rejects(
      fetchPublicCommunityCatalog({ projectId, fetcher }),
      /Firestore/i,
    );
  }
});
