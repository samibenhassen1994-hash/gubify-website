# Community SEO Discovery Design

## Goal

Make every document exposed by `communityPublic` discoverable through server-rendered HTML at `/communities`, while preserving the existing interactive catalog and dynamic Community sitemap.

## Architecture

- `app/communities/page.tsx` remains a Server Component and reads the full public catalog with `fetchPublicCommunityCatalog()`.
- The existing `CommunityCatalog` Client Component receives that result as `initialCommunities`; it owns only search, filters, sorting, and responsive interaction.
- Cards are rendered once by the Client Component during SSR/hydration and retain real `Link` elements to `/community/{slug}`. There is no parallel SEO-only catalog.
- The existing `/api/communities` route remains unchanged for compatibility, but the page no longer depends on a post-hydration request.
- A Firestore failure propagates as a server error instead of producing an empty, indexable catalog.

## Freshness and scale

The page is intentionally dynamic. It performs the existing anonymous Firestore `runQuery` pagination at request time and does not opt into static generation, ISR, or the Worker API cache. A production build must classify/render the route dynamically, so newly projected Communities can appear without a rebuild.

The catalog reader keeps its explicit 100-document query limit and deterministic `__name__` cursor pagination until an empty/partial page is reached. There is no total-result cap; tests cover hundreds and at least one thousand records. This trades additional Firestore reads and HTML size for complete crawler discovery, as requested.

## Sitemap and individual pages

- Add `/communities` to the existing static sitemap entries.
- Preserve all `/community/{slug}` entries, pagination, validation, and `updatedAt` mapping.
- Keep the existing per-Community canonical, Open Graph, Twitter, 404, and upstream-error behavior unchanged.
- Keep `robots.ts` unchanged because it already permits these paths and advertises the sitemap.
- Do not add JSON-LD: there is no required Google rich-result type that improves this generic catalog without risking misleading structured data.

## Privacy and publication boundary

Only the explicitly mapped fields from `communityPublic` are rendered. No user-private or unprojected Firestore data is requested or serialized.

For this release, `communityPublic` is the authoritative website publication set. The separate `communityRestrictions.hiddenFromDiscovery` value is not anonymously readable and is not projected into `communityPublic`. Consequently, a moderated Community may still appear in the catalog and sitemap. This is a known release blocker to assess before publication, not fixed by this change.

## Validation

Tests must prove initial HTML contains Community data and links without client fetch, interactions still work, private fields do not leak, invalid public documents are excluded, failures remain non-indexable server errors, sitemap includes `/communities`, and cursor pagination has no artificial overall limit.
