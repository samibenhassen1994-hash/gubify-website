import assert from "node:assert/strict";
import test from "node:test";

import { getCommunitySocialImageUrl } from "../lib/community-social-image.ts";

test("builds an idempotent 1200 by 630 Cloudinary social image URL", () => {
  const original =
    "https://res.cloudinary.com/s3yauoza/image/upload/v42/community_abc123.jpg";
  const social =
    "https://res.cloudinary.com/s3yauoza/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/v42/community_abc123.jpg";

  assert.equal(getCommunitySocialImageUrl(original), social);
  assert.equal(getCommunitySocialImageUrl(social), social);
});

test("preserves supported non-Cloudinary HTTPS URLs and rejects invalid input", () => {
  const original = "https://images.example.com/communities/football.jpg";

  assert.equal(getCommunitySocialImageUrl(original), original);
  assert.equal(getCommunitySocialImageUrl("http://images.example.com/football.jpg"), null);
  assert.equal(getCommunitySocialImageUrl("not a URL"), null);
  assert.equal(getCommunitySocialImageUrl(undefined), null);
});
