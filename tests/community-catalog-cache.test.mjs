import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const vinextStubs = new Map([
  [
    "vinext/server/image-optimization",
    "export const DEFAULT_DEVICE_SIZES = []; export const DEFAULT_IMAGE_SIZES = []; export async function handleImageOptimization() { throw new Error('not used'); }",
  ],
  [
    "vinext/server/app-router-entry",
    "export default { fetch(request) { return new Response(`vinext:${new URL(request.url).pathname}`, { status: 202 }); } };",
  ],
]);

registerHooks({
  resolve(specifier, _context, nextResolve) {
    const source = vinextStubs.get(specifier);
    if (source) {
      return {
        url: `data:text/javascript,${encodeURIComponent(source)}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, _context);
  },
});

const { handleRequestWithCommunityCatalogCache } = await import(
  "../worker/index.ts"
);

function createCache() {
  const stored = new Map();
  return {
    stored,
    async match(request) {
      return stored.get(request.url)?.clone();
    },
    async put(request, response) {
      stored.set(request.url, response.clone());
    },
  };
}

function createContext() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(promise);
    },
    passThroughOnException() {},
  };
}

test("caches successful catalog responses for 600 seconds and serves query variants as HITs", async () => {
  const cache = createCache();
  const context = createContext();
  let handlerCalls = 0;
  const next = async () => {
    handlerCalls += 1;
    return Response.json({ communities: [{ slug: "football-italia" }] });
  };

  const miss = await handleRequestWithCommunityCatalogCache(
    new Request("https://gubify.com/api/communities?first=1"),
    context,
    next,
    cache,
  );
  assert.equal(handlerCalls, 1);
  assert.equal(miss.headers.get("X-Gubify-Community-Catalog-Cache"), "MISS");
  assert.equal(miss.headers.get("Cache-Control"), "public, max-age=600");
  await Promise.all(context.pending);
  assert.equal(cache.stored.size, 1);
  assert.equal(
    cache.stored.get("https://gubify.com/api/communities").headers.get("X-Gubify-Community-Catalog-Cache"),
    null,
  );

  const hit = await handleRequestWithCommunityCatalogCache(
    new Request("https://gubify.com/api/communities?second=1"),
    createContext(),
    next,
    cache,
  );
  assert.equal(handlerCalls, 1);
  assert.equal(hit.headers.get("X-Gubify-Community-Catalog-Cache"), "HIT");
  assert.equal(hit.headers.get("Cache-Control"), "public, max-age=600");
  assert.equal(await hit.json().then((body) => body.communities[0].slug), "football-italia");

  await handleRequestWithCommunityCatalogCache(
    new Request("https://preview.gubify.com/api/communities"),
    createContext(),
    next,
    cache,
  );
  assert.equal(handlerCalls, 2, "cache keys must remain isolated by host");
});

test("does not cache non-200 catalog responses and never handles sitemap requests", async () => {
  for (const status of [302, 404, 500]) {
    const cache = createCache();
    const context = createContext();
    const response = await handleRequestWithCommunityCatalogCache(
      new Request("https://gubify.com/api/communities"),
      context,
      async () => new Response(null, { status }),
      cache,
    );
    assert.equal(response.status, status);
    assert.equal(response.headers.get("X-Gubify-Community-Catalog-Cache"), "MISS");
    assert.equal(context.pending.length, 0);
    assert.equal(cache.stored.size, 0);
  }

  const cache = createCache();
  const passthrough = new Response("sitemap", { status: 200 });
  assert.equal(
    await handleRequestWithCommunityCatalogCache(
      new Request("https://gubify.com/sitemap.xml"),
      createContext(),
      async () => passthrough,
      cache,
    ),
    passthrough,
  );
  assert.equal(cache.stored.size, 0);

  const postCache = createCache();
  const postResponse = new Response("unchanged", { status: 201 });
  assert.equal(
    await handleRequestWithCommunityCatalogCache(
      new Request("https://gubify.com/api/communities", { method: "POST" }),
      createContext(),
      async () => postResponse,
      postCache,
    ),
    postResponse,
  );
  assert.equal(postCache.stored.size, 0);
});
