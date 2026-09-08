import assert from "node:assert/strict";
import test from "node:test";

const imageUrl =
  "https://res.cloudinary.com/s3yauoza/image/upload/v42/community_abc123.jpg";

const baseEnv = {
  FIREBASE_PROJECT_ID: "gubify-a3e2c",
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

function firestoreDocument({
  slug,
  name,
  includeImage = true,
}) {
  return {
    name: `projects/gubify-a3e2c/databases/(default)/documents/communityPublic/${slug}`,
    fields: {
      slug: { stringValue: slug },
      name: { stringValue: name },
      description: { stringValue: "Italian football fans." },
      language: { stringValue: "Italian" },
      accessMode: { stringValue: "open" },
      ...(includeImage ? { imageUrl: { stringValue: imageUrl } } : {}),
      createdAt: { timestampValue: "2026-08-26T10:00:00Z" },
      updatedAt: { timestampValue: "2026-08-27T11:30:00Z" },
    },
    createTime: "2026-08-26T10:00:00Z",
    updateTime: "2026-08-27T11:30:00Z",
  };
}

const firestoreResponses = new Map();
const firestoreRequests = new Map();

globalThis.__cloudflareTestEnv = baseEnv;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  const slug = decodeURIComponent(url.pathname.split("/").at(-1));
  const requests = firestoreRequests.get(slug) ?? [];
  requests.push({ url: String(input), init });
  firestoreRequests.set(slug, requests);

  const responseFactory = firestoreResponses.get(slug);
  assert.ok(responseFactory, `Unexpected Firestore request for ${slug}`);
  return responseFactory();
};

function prepareFirestore(slug, responseFactory) {
  firestoreRequests.set(slug, []);
  firestoreResponses.set(slug, responseFactory);
}

function requestsFor(slug) {
  return firestoreRequests.get(slug) ?? [];
}

const worker = (await import(new URL("../dist/server/index.js", import.meta.url))).default;

test("renders one public Community request with image and complete metadata", async () => {
  const slug = "football-italia-image";
  prepareFirestore(slug, () =>
    Response.json(firestoreDocument({ slug, name: "Football Italia" })),
  );
      const response = await worker.fetch(
        new Request(`http://localhost/community/${slug}`, {
          headers: { accept: "text/html" },
        }),
        baseEnv,
        executionContext,
      );
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.equal(requestsFor(slug).length, 1, "metadata and page must share one Firestore read");
      assert.match(requestsFor(slug)[0].url, /\/documents\/communityPublic\/football-italia-image/);
      assert.match(html, /<h1[^>]*>Football Italia<\/h1>/i);
      assert.match(html, /Italian football fans\./i);
      assert.match(html, /Italian/i);
      assert.match(html, /Open Community/i);
      assert.match(
        html,
        new RegExp(`<img(?=[^>]*src=["']${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'])(?=[^>]*alt=["']Football Italia Community["'])[^>]*>`, "i"),
      );
      assert.match(html, /<title>Football Italia \| Gubify<\/title>/i);
      assert.match(
        html,
        /<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/gubify\.com\/community\/football-italia-image["']/i,
      );
      assert.match(html, /<meta[^>]*property=["']og:title["'][^>]*content=["']Football Italia \| Gubify["']/i);
      assert.match(html, /<meta[^>]*property=["']og:description["'][^>]*content=["']Italian football fans\.["']/i);
      assert.match(html, /<meta[^>]*property=["']og:url["'][^>]*content=["']https:\/\/gubify\.com\/community\/football-italia-image["']/i);
      assert.match(html, /<meta[^>]*property=["']og:site_name["'][^>]*content=["']Gubify["']/i);
      assert.match(html, /<meta[^>]*property=["']og:type["'][^>]*content=["']website["']/i);
      assert.match(html, /<meta[^>]*property=["']og:image["'][^>]*content=["']https:\/\/res\.cloudinary\.com\/s3yauoza\/image\/upload\/v42\/community_abc123\.jpg["']/i);
});

test("renders a Community without an image or Open Graph image metadata", async () => {
  const slug = "football-italia-no-image";
  prepareFirestore(slug, () =>
    Response.json(
      firestoreDocument({ slug, name: "Football Italia", includeImage: false }),
    ),
  );
      const response = await worker.fetch(
        new Request(`http://localhost/community/${slug}`, {
          headers: { accept: "text/html" },
        }),
        baseEnv,
        executionContext,
      );
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.equal(requestsFor(slug).length, 1, "metadata and page must share one Firestore read");
      assert.match(html, /<h1[^>]*>Football Italia<\/h1>/i);
      assert.doesNotMatch(html, /<img\b/i);
      assert.doesNotMatch(html, /property=["']og:image["']/i);
});

test("returns 404 for invalid and nonexistent Community slugs", async () => {
  const missingSlug = "missing-community";
  prepareFirestore(missingSlug, () => new Response(null, { status: 404 }));
      const invalidResponse = await worker.fetch(
        new Request("http://localhost/community/Football-Italia", {
          headers: { accept: "text/html" },
        }),
        baseEnv,
        executionContext,
      );
      assert.equal(invalidResponse.status, 404);
      assert.equal(requestsFor("Football-Italia").length, 0, "invalid slugs must not reach Firestore");

      const missingResponse = await worker.fetch(
        new Request(`http://localhost/community/${missingSlug}`, {
          headers: { accept: "text/html" },
        }),
        baseEnv,
        executionContext,
      );
      assert.equal(missingResponse.status, 404);
      assert.equal(requestsFor(missingSlug).length, 1);
});

test("does not turn a temporary Firestore failure into 404", async () => {
  const slug = "temporarily-unavailable";
  prepareFirestore(slug, () => new Response(null, { status: 503 }));
      const outcome = await worker
        .fetch(
          new Request(`http://localhost/community/${slug}`, {
            headers: { accept: "text/html" },
          }),
          baseEnv,
          executionContext,
        )
        .then((response) => ({ response }), (error) => ({ error }));

      assert.equal(requestsFor(slug).length, 1);
      if ("response" in outcome) {
        assert.notEqual(outcome.response.status, 404);
        assert.ok(outcome.response.status >= 500);
      } else {
        assert.ok(outcome.error instanceof Error);
      }
});
