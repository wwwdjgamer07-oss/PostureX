/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  onDemandEntries: {
    // Reduce aggressive dev-page disposal that can cause missing chunk loads on Windows.
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  webpack(config, { dev }) {
    if (dev) {
      // Avoid flaky filesystem cache issues on Windows dev environments.
      config.cache = false;

      // Suppress a noisy Next.js dev warning caused by malformed sourcemap comments
      // in generated .next/server/vendor-chunks/next.js on some Windows setups.
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        (warning) => {
          const message = typeof warning === "string" ? warning : warning?.message;
          return (
            typeof message === "string" &&
            message.includes("Could not read source map for file:///") &&
            message.includes("/.next/server/vendor-chunks/next.js") &&
            message.includes("link.js.map")
          );
        }
      ];
    }
    return config;
  }
};

if (process.env.NODE_ENV === "production") {
  const withPWA = require("next-pwa")({
    dest: "public",
    disable: false,
    register: true,
    skipWaiting: true,
    fallbacks: {
      document: "/offline"
    }
  });

  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
