import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

const appUrl = getAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"]
      }
    ],
    sitemap: `${appUrl}/sitemap.xml`
  };
}
