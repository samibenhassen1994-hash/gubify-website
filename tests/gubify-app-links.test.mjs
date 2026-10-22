import assert from "node:assert/strict";
import test from "node:test";

import {
  ANDROID_STORE_URL,
  APP_DEEP_LINK,
  buildAndroidCommunityIntent,
  buildCommunityHttpsUrl,
  communityLaunchTarget,
} from "../lib/gubify-app-links.ts";

test("builds the canonical Community HTTPS destination", () => {
  assert.equal(APP_DEEP_LINK, "https://gubify.com/community/{slug}");
  assert.equal(
    buildCommunityHttpsUrl("football-italia"),
    "https://gubify.com/community/football-italia",
  );
});

test("builds an Android intent for the HTTPS route with Play fallback", () => {
  assert.equal(
    ANDROID_STORE_URL,
    "https://play.google.com/store/apps/details?id=com.gubify.app",
  );
  assert.equal(
    buildAndroidCommunityIntent("commgub"),
    "intent://gubify.com/community/commgub#Intent;scheme=https;package=com.gubify.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.gubify.app;end",
  );
});

test("only Android receives a launch target", () => {
  assert.match(
    communityLaunchTarget("commgub", "Mozilla/5.0 (Linux; Android 15)"),
    /^intent:\/\/gubify\.com\/community\/commgub/,
  );
  assert.equal(
    communityLaunchTarget("commgub", "Mozilla/5.0 (Windows NT 10.0)"),
    null,
  );
  assert.equal(
    communityLaunchTarget("commgub", "Mozilla/5.0 (iPhone; CPU iPhone OS)"),
    null,
  );
});

test("rejects malformed Community slugs", () => {
  for (const slug of ["", "Community", "community_name", "-community", "a".repeat(61)]) {
    assert.throws(() => buildCommunityHttpsUrl(slug), /Invalid Community slug/);
    assert.throws(() => buildAndroidCommunityIntent(slug), /Invalid Community slug/);
  }
});
