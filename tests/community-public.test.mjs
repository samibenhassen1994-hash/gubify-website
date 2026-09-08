import assert from "node:assert/strict";
import test from "node:test";

import { fetchPublicCommunityBySlug } from "../lib/community-public.ts";

const projectId = "gubify-a3e2c";

function firestoreDocument(overrides = {}) {
  return {
    name: `projects/${projectId}/databases/(default)/documents/communityPublic/football-italia`,
    fields: {
      slug: { stringValue: "football-italia" },
      name: { stringValue: "Football Italia" },
      description: { stringValue: "Italian football fans." },
      language: { stringValue: "Italian" },
      accessMode: { stringValue: "open" },
      imageUrl: {
        stringValue:
          "https://res.cloudinary.com/s3yauoza/image/upload/v42/community_abc123.jpg",
      },
      createdAt: { timestampValue: "2026-08-26T10:00:00Z" },
      updatedAt: { timestampValue: "2026-08-27T11:30:00Z" },
      ...overrides,
    },
    createTime: "2026-08-26T10:00:00Z",
    updateTime: "2026-08-27T11:30:00Z",
  };
}

test("rejects noncanonical Community slugs before making a request", async () => {
  const invalidSlugs = [
    "",
    "Football-Italia",
    " football-italia",
    "football-italia ",
    "football--italia",
    "-football",
    "football-",
    "football/italia",
    "football_italia",
    "fóotball",
    "a".repeat(61),
  ];
  let requests = 0;
  const fetcher = async () => {
    requests += 1;
    return new Response(null, { status: 500 });
  };

  for (const slug of invalidSlugs) {
    assert.deepEqual(
      await fetchPublicCommunityBySlug(slug, { projectId, fetcher }),
      { status: "not-found" },
    );
  }
  assert.equal(requests, 0);
});

test("reads one masked public Community document and maps only public fields", async () => {
  const requests = [];
  const result = await fetchPublicCommunityBySlug("football-italia", {
    projectId,
    fetcher: async (input, init) => {
      requests.push({ input: String(input), init });
      return Response.json(firestoreDocument());
    },
  });

  assert.equal(requests.length, 1);
  const requestUrl = new URL(requests[0].input);
  assert.equal(requestUrl.origin, "https://firestore.googleapis.com");
  assert.equal(
    requestUrl.pathname,
    "/v1/projects/gubify-a3e2c/databases/(default)/documents/communityPublic/football-italia",
  );
  assert.deepEqual(requestUrl.searchParams.getAll("mask.fieldPaths"), [
    "slug",
    "name",
    "description",
    "language",
    "accessMode",
    "imageUrl",
    "createdAt",
    "updatedAt",
  ]);
  assert.equal(requests[0].init?.method, "GET");
  assert.deepEqual(result, {
    status: "found",
    community: {
      slug: "football-italia",
      name: "Football Italia",
      description: "Italian football fans.",
      language: "Italian",
      accessMode: "open",
      imageUrl:
        "https://res.cloudinary.com/s3yauoza/image/upload/v42/community_abc123.jpg",
      createdAt: "2026-08-26T10:00:00Z",
      updatedAt: "2026-08-27T11:30:00Z",
    },
  });
});

test("accepts the shortest and longest canonical slugs", async () => {
  for (const slug of ["a", "a".repeat(60)]) {
    const result = await fetchPublicCommunityBySlug(slug, {
      projectId,
      fetcher: async () =>
        Response.json(
          firestoreDocument({
            slug: { stringValue: slug },
            imageUrl: undefined,
          }),
        ),
    });
    assert.equal(result.status, "found");
    assert.equal(result.status === "found" && result.community.imageUrl, null);
  }
});

test("distinguishes a missing document from upstream failures", async () => {
  assert.deepEqual(
    await fetchPublicCommunityBySlug("missing", {
      projectId,
      fetcher: async () => new Response(null, { status: 404 }),
    }),
    { status: "not-found" },
  );

  for (const fetcher of [
    async () => new Response(null, { status: 503 }),
    async () => {
      throw new Error("network unavailable");
    },
    async () => Response.json(firestoreDocument({ name: { integerValue: "1" } })),
    async () => Response.json(firestoreDocument({ slug: { stringValue: "other" } })),
  ]) {
    assert.deepEqual(
      await fetchPublicCommunityBySlug("football-italia", {
        projectId,
        fetcher,
      }),
      { status: "upstream-failure" },
    );
  }
});

test("rejects an unsupported Community access mode", async () => {
  const result = await fetchPublicCommunityBySlug("football-italia", {
    projectId,
    fetcher: async () =>
      Response.json(
        firestoreDocument({ accessMode: { stringValue: "private" } }),
      ),
  });

  assert.deepEqual(result, { status: "upstream-failure" });
});

test("does not request Firestore when the server project ID is unavailable", async () => {
  let requested = false;
  const result = await fetchPublicCommunityBySlug("football-italia", {
    projectId: undefined,
    fetcher: async () => {
      requested = true;
      return Response.json(firestoreDocument());
    },
  });

  assert.deepEqual(result, { status: "upstream-failure" });
  assert.equal(requested, false);
});
