import type { MetadataRoute } from "next";

import { fetchCommunitySitemapEntries } from "../lib/community-sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date("2026-07-23T00:00:00+02:00");
  const legalLastModified = new Date("2026-09-09T00:00:00+02:00");

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://gubify.com",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://gubify.com/support",
      lastModified: new Date("2026-07-29T00:00:00+02:00"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gubify.com/privacy",
      lastModified: legalLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://gubify.com/pre-register",
      lastModified: new Date("2026-07-29T00:00:00+02:00"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: "https://gubify.com/gallery", lastModified: new Date("2026-08-07T00:00:00+02:00"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://gubify.com/feedback", lastModified: new Date("2026-08-02T00:00:00+02:00"), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://gubify.com/delete-account", lastModified: new Date("2026-09-01T00:00:00+02:00"), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://gubify.com/terms", lastModified: legalLastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://gubify.com/guidelines", lastModified: legalLastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://gubify.com/fundraising", lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const communities = await fetchCommunitySitemapEntries();
  return [
    ...staticEntries,
    ...communities.map(({ slug, updatedAt }) => ({
      url: `https://gubify.com/community/${slug}`,
      lastModified: updatedAt,
    })),
  ];
}
