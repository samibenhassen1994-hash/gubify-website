import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-23T00:00:00+02:00");

  return [
    {
      url: "https://gubify.com",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://gubify.com/support",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
