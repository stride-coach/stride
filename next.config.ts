import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.PLAYWRIGHT_TEST
    ? { distDir: ".next-e2e", devIndicators: false }
    : { output: "standalone" }),
  allowedDevOrigins: [
    "127.0.0.1",
    ...(process.env.ALLOWED_DEV_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],
  async redirects() {
    return [
      { source: "/coach/equipe", destination: "/coach/team", permanent: true },
      { source: "/coach/new", destination: "/coach", permanent: false },
      { source: "/health", destination: "/health/fitness", permanent: false },
      {
        source: "/nutrition",
        destination: "/health/nutrition",
        permanent: true,
      },
      {
        source: "/gear/:path*",
        destination: "/activities/gear/:path*",
        permanent: true,
      },
      { source: "/progress", destination: "/health/fitness", permanent: true },
      {
        source: "/progress/:section(body|recovery|health)",
        destination: "/health/recovery",
        permanent: true,
      },
      {
        source: "/progress/records",
        destination: "/health/records",
        permanent: true,
      },
      { source: "/coach/nouvelle", destination: "/coach/new", permanent: true },
      {
        source: "/races/:id/preparation",
        destination: "/races/:id/gear",
        permanent: true,
      },
      {
        source: "/activities/:id/details",
        destination: "/activities/:id",
        permanent: true,
      },
      {
        source: "/plan/historique",
        destination: "/plan/history",
        permanent: true,
      },
      {
        source: "/plan",
        has: [{ type: "query", key: "proposition", value: "(?<id>.+)" }],
        destination: "/plan?proposal=:id",
        permanent: true,
      },
      {
        source: "/plan",
        has: [{ type: "query", key: "seance", value: "(?<key>.+)" }],
        destination: "/plan?session=:key",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
    proxyClientMaxBodySize: "21mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
