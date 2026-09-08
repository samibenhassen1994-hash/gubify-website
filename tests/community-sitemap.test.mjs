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

const { default: sitemap } = await import("../app/sitemap.ts");
const { fetchCommunitySitemapEntries } = await import(
  "../lib/community-sitemap.ts"
);

const projectId = "gubify-a3e2c";
const pageSize = 100;

function community(index, overrides = {}) {
  const slug = `community-${String(index).padStart(4, "0")}`;
  return {
    slug,
    updatedAt: `2026-09-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    ...overrides,
  };
}

function runQueryDocument(entry) {
  return {
    document: {
      name: `projects/${projectId}/databases/(default)/documents/communityPublic/${entry.slug}`,
      fields: {
        slug: { stringValue: entry.slug },
        updatedAt: { timestampValue: entry.updatedAt },
      },
    },
    readTime: "2026-09-08T12:00:00.000Z",
  };
}

function paginatedFirestore(total) {
  const entries = Array.from({ length: total }, (_, index) => community(index + 1));
  const requests = [];

  return {
    entries,
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

function assertBoundedStructuredQueries(requests) {
  for (const [index, request] of requests.entries()) {
    assert.equal(
      request.url,
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    );
    assert.equal(request.init?.method, "POST");
    assert.equal(request.body.structuredQuery.limit, pageSize);
    assert.ok(request.body.structuredQuery.limit <= 100);
    assert.equal(Object.hasOwn(request.body.structuredQuery, "offset"), false);
    assert.deepEqual(request.body.structuredQuery.select.fields, [
      { fieldPath: "slug" },
      { fieldPath: "updatedAt" },
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
  [80, 1],
  [100, 2],
  [101, 2],
  [200, 3],
  [201, 3],
  [250, 3],
]) {
  test(`discovers ${total} Communities in ${expectedQueries} bounded queries`, async () => {
    const firestore = paginatedFirestore(total);
    const result = await fetchCommunitySitemapEntries({
      projectId,
      fetcher: firestore.fetcher,
    });

    assert.equal(firestore.requests.length, expectedQueries);
    assert.equal(result.length, total);
    assert.equal(new Set(result.map((entry) => entry.slug)).size, total);
    assert.deepEqual(
      result.map((entry) => entry.slug),
      firestore.entries.map((entry) => entry.slug),
    );
    assertBoundedStructuredQueries(firestore.requests);
  });
}

test("maps updatedAt to sitemap lastModified and preserves every static URL", async () => {
  const firestore = paginatedFirestore(1);
  globalThis.__cloudflareTestEnv = { FIREBASE_PROJECT_ID: projectId };
  globalThis.fetch = firestore.fetcher;

  const result = await sitemap();
  const urls = result.map((entry) => entry.url);
  const expectedStaticUrls = [
    "https://gubify.com",
    "https://gubify.com/support",
    "https://gubify.com/privacy",
    "https://gubify.com/pre-register",
    "https://gubify.com/gallery",
    "https://gubify.com/feedback",
    "https://gubify.com/delete-account",
    "https://gubify.com/terms",
    "https://gubify.com/fundraising",
  ];

  for (const url of expectedStaticUrls) assert.ok(urls.includes(url));
  const dynamic = result.find(
    (entry) => entry.url === "https://gubify.com/community/community-0001",
  );
  assert.ok(dynamic);
  assert.equal(dynamic.lastModified.toISOString(), firestore.entries[0].updatedAt);
});

test("rejects malformed slugs and timestamps", async () => {
  for (const fields of [
    { slug: "Invalid-Slug", updatedAt: "2026-09-08T12:00:00.000Z" },
    { slug: "valid-slug", updatedAt: "not-a-timestamp" },
    { slug: "valid-slug", updatedAt: "2026-09-08" },
    { slug: "valid-slug", updatedAt: "2026-02-30T12:00:00.000Z" },
  ]) {
    await assert.rejects(
      fetchCommunitySitemapEntries({
        projectId,
        fetcher: async () => Response.json([runQueryDocument(fields)]),
      }),
      /malformed/i,
    );
  }
});

test("does not convert malformed or failed Firestore responses into an empty list", async () => {
  await assert.rejects(
    fetchCommunitySitemapEntries({
      projectId,
      fetcher: async () => Response.json([]),
    }),
    /malformed/i,
  );
  await assert.rejects(
    fetchCommunitySitemapEntries({
      projectId,
      fetcher: async () => new Response(null, { status: 503 }),
    }),
    /Firestore/i,
  );
  await assert.rejects(
    fetchCommunitySitemapEntries({
      projectId,
      fetcher: async () => Response.json([{ done: "yes" }]),
    }),
    /malformed/i,
  );
});
