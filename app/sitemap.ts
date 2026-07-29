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
      lastModified: new Date("2026-07-29T00:00:00+02:00"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gubify.com/privacy",
      lastModified: new Date("2026-07-29T00:00:00+02:00"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://gubify.com/pre-register",
      lastModified: new Date("2026-07-29T00:00:00+02:00"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
