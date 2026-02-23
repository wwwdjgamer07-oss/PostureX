import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostureX",
    short_name: "PostureX",
    description: "AI posture intelligence & PX Play arcade",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F14",
    theme_color: "#22D3EE",
    orientation: "portrait",
    lang: "en-US",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
