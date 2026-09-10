import { fetchPublicCommunityCatalog } from "../../../lib/community-catalog";

export async function GET() {
  try {
    const communities = await fetchPublicCommunityCatalog();
    return Response.json({
      communities: communities.map((community) => ({
        slug: community.slug,
        name: community.name,
        description: community.description,
        ...(community.type ? { type: community.type } : {}),
        language: community.language,
        accessMode: community.accessMode,
        ...(community.memberCount === undefined
          ? {}
          : { memberCount: community.memberCount }),
        imageUrl: community.imageUrl,
        createdAt: community.createdAt,
      })),
    });
  } catch {
    return Response.json(
      { error: "Communities are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
