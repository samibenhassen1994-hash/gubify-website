import assert from "node:assert/strict";
import test from "node:test";

const baseEnv = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

const worker = (await import(new URL("../dist/server/index.js", import.meta.url))).default;

test("renders the indexable Explore Communities page and its initial catalog state", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/communities", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Explore Communities \| Gubify<\/title>/i);
  assert.match(html, /<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/gubify\.com\/communities["']/i);
  assert.match(html, /<h1[^>]*>Explore Communities<\/h1>/i);
  assert.match(html, /Loading communities/i);
});
