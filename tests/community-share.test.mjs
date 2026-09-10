import assert from "node:assert/strict";
import test from "node:test";

import {
  getCommunityShareFeedback,
  shareCommunity,
} from "../lib/community-share.ts";

const community = {
  slug: "football-italia",
  communityName: "Football Italia",
};

test("shares the canonical Community URL with the native share sheet", async () => {
  const sharedPayloads = [];
  let clipboardCalls = 0;
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error("sharing must not make network requests");
  };

  try {
    const result = await shareCommunity({
      ...community,
      navigatorLike: {
        share: async (payload) => {
          sharedPayloads.push(payload);
        },
        clipboard: {
          writeText: async () => {
            clipboardCalls += 1;
          },
        },
      },
    });

    assert.equal(result, "shared");
    assert.deepEqual(sharedPayloads, [
      {
        title: "Football Italia | Gubify",
        text: "Check out Football Italia on Gubify.",
        url: "https://gubify.com/community/football-italia",
      },
    ]);
    assert.equal(clipboardCalls, 0);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("copies the canonical URL and reports copied feedback without native sharing", async () => {
  const copiedUrls = [];
  const result = await shareCommunity({
    ...community,
    navigatorLike: {
      clipboard: {
        writeText: async (url) => {
          copiedUrls.push(url);
        },
      },
    },
  });

  assert.equal(result, "copied");
  assert.deepEqual(copiedUrls, ["https://gubify.com/community/football-italia"]);
  assert.equal(getCommunityShareFeedback(result), "Link copied");
});

test("treats native share cancellation as a normal outcome", async () => {
  const result = await shareCommunity({
    ...community,
    navigatorLike: {
      share: async () => {
        throw { name: "AbortError" };
      },
    },
  });

  assert.equal(result, "cancelled");
  assert.equal(getCommunityShareFeedback(result), null);
});

test("reports a native share failure without falling back to clipboard", async () => {
  let clipboardCalls = 0;
  const result = await shareCommunity({
    ...community,
    navigatorLike: {
      share: async () => {
        throw new Error("share unavailable");
      },
      clipboard: {
        writeText: async () => {
          clipboardCalls += 1;
        },
      },
    },
  });

  assert.equal(result, "error");
  assert.equal(clipboardCalls, 0);
  assert.equal(getCommunityShareFeedback(result), "Unable to share Community.");
});

test("reports a clipboard failure when native sharing is unavailable", async () => {
  const result = await shareCommunity({
    ...community,
    navigatorLike: {
      clipboard: {
        writeText: async () => {
          throw new Error("clipboard unavailable");
        },
      },
    },
  });

  assert.equal(result, "error");
  assert.equal(getCommunityShareFeedback(result), "Unable to share Community.");
});
