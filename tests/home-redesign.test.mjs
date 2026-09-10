import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const baseEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  IMAGES: {
    input() {
      throw new Error("Image processing is not expected in this test");
    },
  },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("home presents Private Gubs and Communities in the community-first redesign", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Find your people\./i);
  assert.match(html, /Build your space\./i);
  assert.match(html, /Private Gubs for the people closest to you/i);
  assert.match(html, /Close with your people\./i);
  assert.match(html, /Open to your passions\./i);
  assert.match(html, /Turn conversation into action\./i);
  assert.match(html, /Ask\. Help\. Level up\./i);
  assert.match(html, /Stand out by helping others\./i);
  assert.match(html, /Your people are out there\./i);
  assert.match(html, /href=["']\/communities["']/i);
  assert.match(html, /href=["']\/pre-register["']/i);
  assert.doesNotMatch(html, /Launching 15 September 2026/i);
  assert.doesNotMatch(html, /launch countdown/i);
  assert.doesNotMatch(html, /Group Goals/i);
  assert.match(html, /aria-label=["']Private Gub app preview["']/i);
  assert.match(html, /aria-label=["']Community reputation preview["']/i);
});
