import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

const appUrl = getAppUrl();

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
