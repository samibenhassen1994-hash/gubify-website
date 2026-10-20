# Community moderation/discovery synchronization proposal

## Current gap

The website can anonymously read `communityPublic`, but `hiddenFromDiscovery` is stored separately in `communityRestrictions`. Current Rules do not allow the website to list those restrictions, and the public projection does not carry an equivalent publication flag. Therefore a Community hidden by moderation may still be present in the public catalog and sitemap.

## Proposed follow-up (not implemented here)

Use one trusted moderation operation to update both documents atomically:

- Hide: set `communityRestrictions/{communityId}.hiddenFromDiscovery` to `true` and remove (or explicitly deactivate) the matching `communityPublic/{slug}` projection in the same transaction/batch.
- Unhide: set the restriction to `false` and recreate the validated, minimal public projection from authoritative Community data in the same transaction/batch.
- Rename/delete: update the restriction/public projection mapping in the same trusted operation so no stale slug remains discoverable.

Deleting the projection is the smallest privacy-preserving model because the current website already treats `communityPublic` as the publication authority. It would also make the direct public page return 404 while hidden; product and moderation owners must explicitly approve that behavior.

## Rules compatibility

The current client-facing Rules are not sufficient for this operation: restriction writes and public-projection deletion/recreation are constrained to existing lifecycle paths. Do not broaden anonymous or ordinary member permissions. Implement the synchronization in a trusted backend/admin path, or add narrowly scoped moderator Rules backed by verified roles, then add emulator tests proving ordinary users cannot hide, restore, or forge public projections.

The Rules change, Flutter/Moderation Center integration, migration of already-hidden Communities, and rollback/reconciliation tooling require a separate reviewed change before publication.
