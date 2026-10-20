# Community SEO Discovery Implementation Plan

1. Add failing page tests for server-rendered catalog cards, permanent Community links, privacy, dynamic freshness, and upstream failure behavior.
2. Convert `/communities` to an async Server Component and pass the fetched catalog into the existing interactive Client Component; remove its initial API fetch without changing filtering or presentation.
3. Add failing sitemap coverage for `/communities` and large-catalog pagination coverage, then make the minimal sitemap update.
4. Add the separate moderation synchronization proposal, without changing Flutter, Rules, or Moderation Center.
5. Run focused tests, the full app suite, TypeScript, lint, production build/artifact validation, and `git diff --check`; inspect the generated route behavior for runtime rendering.
6. Review the complete diff, create the requested checkpoint commit, and push only `feat/community-seo-discovery`.
