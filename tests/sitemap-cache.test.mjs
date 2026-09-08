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

const { default: worker, handleRequestWithSitemapCache } = await import(
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

test("stores one successful sitemap and serves later query variants as a HIT", async () => {
  const cache = createCache();
  const context = createContext();
  let handlerCalls = 0;
  const next = async () => {
    handlerCalls += 1;
    return new Response("<urlset><url /></urlset>", {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  };

  const miss = await handleRequestWithSitemapCache(
    new Request("https://gubify.com/sitemap.xml?crawler=first"),
    context,
    next,
    cache,
  );
  assert.equal(handlerCalls, 1);
  assert.equal(miss.headers.get("X-Gubify-Sitemap-Cache"), "MISS");
  assert.equal(miss.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(miss.headers.get("Content-Type"), "application/xml; charset=utf-8");
  assert.equal(await miss.text(), "<urlset><url /></urlset>");
  assert.equal(context.pending.length, 1);
  await Promise.all(context.pending);

  assert.deepEqual([...cache.stored.keys()], ["https://gubify.com/sitemap.xml"]);
  const stored = cache.stored.get("https://gubify.com/sitemap.xml");
  assert.equal(stored.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(stored.headers.get("X-Gubify-Sitemap-Cache"), null);

  const hit = await handleRequestWithSitemapCache(
    new Request("https://gubify.com/sitemap.xml?crawler=second"),
    createContext(),
    next,
    cache,
  );
  assert.equal(handlerCalls, 1, "a cache HIT must not call vinext");
  assert.equal(hit.headers.get("X-Gubify-Sitemap-Cache"), "HIT");
  assert.equal(hit.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(hit.headers.get("Content-Type"), "application/xml; charset=utf-8");
  assert.equal(await hit.text(), "<urlset><url /></urlset>");

  await handleRequestWithSitemapCache(
    new Request("https://preview.gubify.com/sitemap.xml"),
    createContext(),
    next,
    cache,
  );
  assert.equal(handlerCalls, 2, "cache keys must remain isolated by host");
});

test("does not cache redirects, client errors, or server errors", async () => {
  for (const status of [302, 404, 500]) {
    const cache = createCache();
    const context = createContext();
    let handlerCalls = 0;
    const response = await handleRequestWithSitemapCache(
      new Request("https://gubify.com/sitemap.xml"),
      context,
      async () => {
        handlerCalls += 1;
        return new Response(null, { status });
      },
      cache,
    );

    assert.equal(response.status, status);
    assert.equal(response.headers.get("X-Gubify-Sitemap-Cache"), "MISS");
    assert.equal(handlerCalls, 1);
    assert.equal(context.pending.length, 0);
    assert.equal(cache.stored.size, 0);
  }
});

test("bypasses non-GET sitemap requests and every other route", async () => {
  for (const request of [
    new Request("https://gubify.com/sitemap.xml", { method: "POST" }),
    new Request("https://gubify.com/community/example"),
    new Request("https://gubify.com/api/pre-register/count"),
    new Request("https://gubify.com/_vinext/image"),
  ]) {
    const cache = createCache();
    const context = createContext();
    const original = new Response("unchanged", { status: 201 });
    let handlerCalls = 0;
    const response = await handleRequestWithSitemapCache(
      request,
      context,
      async () => {
        handlerCalls += 1;
        return original;
      },
      cache,
    );

    assert.equal(response, original);
    assert.equal(handlerCalls, 1);
    assert.equal(context.pending.length, 0);
    assert.equal(cache.stored.size, 0);
    assert.equal(response.headers.get("X-Gubify-Sitemap-Cache"), null);
  }
});

test("the Worker does not access caches.default for non-sitemap routes", async () => {
  assert.equal("caches" in globalThis, false);
  const response = await worker.fetch(
    new Request("https://gubify.com/community/example"),
    {},
    createContext(),
  );

  assert.equal(response.status, 202);
  assert.equal(await response.text(), "vinext:/community/example");
});
