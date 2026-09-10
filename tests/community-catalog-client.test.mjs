import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAndSortCommunities,
  getCatalogLanguages,
} from "../lib/community-catalog-client.ts";

const communities = [
  {
    slug: "alpha-gaming",
    name: "Alpha Gaming",
    description: "Competitive game nights and tournaments.",
    type: "Gaming",
    language: "English",
    accessMode: "open",
    memberCount: 50,
    imageUrl: null,
    createdAt: "2026-09-03T12:00:00.000Z",
  },
  {
    slug: "books-roma",
    name: "Books Roma",
    description: "Leggiamo e discutiamo nuovi romanzi.",
    type: "Books & Reading",
    language: "Italian",
    accessMode: "approval",
    memberCount: 50,
    imageUrl: null,
    createdAt: "2026-09-04T12:00:00.000Z",
  },
  {
    slug: "cinema-local",
    name: "Cinema Local",
    description: "Film, incontri e anteprime locali.",
    type: "Local",
    language: "Italian",
    accessMode: "open",
    imageUrl: null,
    createdAt: "2026-09-02T12:00:00.000Z",
  },
  {
    slug: "legacy-friends",
    name: "Friends Club",
    description: "Friends who plan weekend walks.",
    type: "Friends",
    language: "English",
    accessMode: "open",
    imageUrl: null,
    createdAt: "2026-09-01T12:00:00.000Z",
  },
];

test("filters the downloaded catalog locally by search, category, language, and access", () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error("catalog interactions must not fetch");
  };

  try {
    assert.deepEqual(
      filterAndSortCommunities(communities, {
        search: "alpha",
        category: "All",
        language: "All",
        access: "All",
        sort: "Popular",
      }).map((community) => community.slug),
      ["alpha-gaming"],
    );
    assert.deepEqual(
      filterAndSortCommunities(communities, {
        search: "tournaments",
        category: "All",
        language: "All",
        access: "All",
        sort: "Popular",
      }).map((community) => community.slug),
      ["alpha-gaming"],
    );
    assert.deepEqual(
      filterAndSortCommunities(communities, {
        search: "",
        category: "Books & Reading",
        language: "Italian",
        access: "Approval",
        sort: "A-Z",
      }).map((community) => community.slug),
      ["books-roma"],
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("derives language options from real catalog values and keeps legacy types unmapped", () => {
  assert.deepEqual(getCatalogLanguages(communities), ["English", "Italian"]);
  assert.deepEqual(
    filterAndSortCommunities(communities, {
      search: "",
      category: "Friends",
      language: "All",
      access: "All",
      sort: "A-Z",
    }).map((community) => community.slug),
    ["legacy-friends"],
  );
});

test("sorts Popular, Newest, and A-Z deterministically without mutating the catalog", () => {
  const originalSlugs = communities.map((community) => community.slug);
  const baseFilters = { search: "", category: "All", language: "All", access: "All" };

  assert.deepEqual(
    filterAndSortCommunities(communities, { ...baseFilters, sort: "Popular" }).map((community) => community.slug),
    ["alpha-gaming", "books-roma", "cinema-local", "legacy-friends"],
  );
  assert.deepEqual(
    filterAndSortCommunities(communities, { ...baseFilters, sort: "Newest" }).map((community) => community.slug),
    ["books-roma", "alpha-gaming", "cinema-local", "legacy-friends"],
  );
  assert.deepEqual(
    filterAndSortCommunities(communities, { ...baseFilters, sort: "A-Z" }).map((community) => community.slug),
    ["alpha-gaming", "books-roma", "cinema-local", "legacy-friends"],
  );
  assert.deepEqual(communities.map((community) => community.slug), originalSlugs);
});
