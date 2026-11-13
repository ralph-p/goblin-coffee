import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosting (Phase 9): build with NEXT_OUTPUT=standalone for a Docker-ready server.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  experimental: {
    // Product photo uploads go through a server action (5 MB max + multipart overhead).
    serverActions: { bodySizeLimit: "6mb" },
  },
  partialPrefetching: true,
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
