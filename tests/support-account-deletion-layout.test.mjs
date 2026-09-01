import assert from "node:assert/strict";
import test from "node:test";

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

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "support-account-deletion-layout-test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

test("support deletion section presents pre-registration and account deletion side by side", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/support", {
      headers: { accept: "text/html" },
    }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /Delete your pre-registration or request account deletion/i,
  );
  assert.match(
    html,
    /<section[^>]*id=["']delete-pre-registration["'][^>]*>[\s\S]*?Delete your pre-registration[\s\S]*?Delete your Gubify account[\s\S]*?href=["']\/delete-account["'][^>]*>[\s\S]*?Request account deletion[\s\S]*?<\/section>/i,
  );
  assert.doesNotMatch(
    html,
    /<section[^>]*aria-labelledby=["']contact-title["'][^>]*>[\s\S]*?href=["']\/delete-account["']/i,
  );
});
