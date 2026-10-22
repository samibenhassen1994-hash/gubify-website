import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assetlinksUrl = new URL(
  "../public/.well-known/assetlinks.json",
  import.meta.url,
);

test("associates gubify.com with the Google Play signed Android app", async () => {
  const document = JSON.parse(await readFile(assetlinksUrl, "utf8"));

  assert.deepEqual(document, [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.gubify.app",
        sha256_cert_fingerprints: [
          "13:CA:6C:DB:A5:14:F5:E5:C5:B4:D9:9D:95:C2:16:68:83:F0:BF:C8:F2:14:73:22:CF:21:52:8A:55:A3:59:47",
        ],
      },
    },
  ]);
});
