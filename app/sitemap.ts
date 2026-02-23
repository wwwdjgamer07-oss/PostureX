import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const date = new Date();

  return [
    {
      url: appUrl,
      lastModified: date,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${appUrl}/pricing`,
      lastModified: date,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${appUrl}/auth`,
      lastModified: date,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];
}
