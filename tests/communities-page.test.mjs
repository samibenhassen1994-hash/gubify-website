import assert from "node:assert/strict";
import test from "node:test";

const baseEnv = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

const projectId = "gubify-a3e2c";
let catalogEntries = [];
let firestoreStatus = 200;

globalThis.__cloudflareTestEnv = { FIREBASE_PROJECT_ID: projectId };
globalThis.fetch = async (_input, init) => {
  assert.equal(init?.method, "POST");
  if (firestoreStatus !== 200) return new Response(null, { status: firestoreStatus });
  return Response.json([
    ...catalogEntries.map((community) => ({
      document: {
        name: `projects/${projectId}/databases/(default)/documents/communityPublic/${community.slug}`,
        fields: {
          slug: { stringValue: community.slug },
          name: { stringValue: community.name },
          description: { stringValue: community.description },
          language: { stringValue: community.language ?? "English" },
          accessMode: { stringValue: community.accessMode ?? "open" },
          createdAt: { timestampValue: community.createdAt ?? "2026-10-20T10:00:00.000Z" },
          ownerEmail: { stringValue: "private@example.com" },
        },
      },
      readTime: "2026-10-20T10:00:00.000Z",
    })),
    { readTime: "2026-10-20T10:00:00.000Z", done: true },
  ]);
};

const worker = (await import(new URL("../dist/server/index.js", import.meta.url))).default;

test.beforeEach(() => {
  firestoreStatus = 200;
  catalogEntries = [{
    slug: "public-community",
    name: "Public Community",
    description: "A public description for everyone.",
  }];
});

async function renderCommunitiesPage() {
  return worker.fetch(
    new Request("http://localhost/communities", { headers: { accept: "text/html" } }),
    { ...baseEnv, FIREBASE_PROJECT_ID: projectId },
    executionContext,
  );
}

test("renders public Communities and permanent links in the initial HTML", async () => {
  const response = await renderCommunitiesPage();
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Explore Communities \| Gubify<\/title>/i);
  assert.match(html, /<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/gubify\.com\/communities["']/i);
  assert.match(html, /<h1[^>]*>Explore Communities<\/h1>/i);
  assert.match(html, />Public Community<\/h3>/i);
  assert.match(html, /href=["']\/community\/public-community["']/i);
  assert.match(html, /A public description for everyone\./i);
  assert.doesNotMatch(html, /Loading communities/i);
  assert.doesNotMatch(html, /private@example\.com/i);
});

test("renders fresh server data on a later request instead of a build-time snapshot", async () => {
  const firstHtml = await (await renderCommunitiesPage()).text();
  catalogEntries = [{
    slug: "new-community",
    name: "New Community",
    description: "Created after the first request.",
  }];
  const secondHtml = await (await renderCommunitiesPage()).text();

  assert.match(firstHtml, /Public Community/i);
  assert.doesNotMatch(firstHtml, /New Community/i);
  assert.match(secondHtml, /New Community/i);
  assert.match(secondHtml, /href=["']\/community\/new-community["']/i);
});

test("does not turn a Firestore failure into an empty indexable catalog", async () => {
  firestoreStatus = 503;
  await assert.rejects(renderCommunitiesPage(), (error) => {
    assert.notEqual(error?.digest, "NEXT_NOT_FOUND");
    return true;
  });
});
