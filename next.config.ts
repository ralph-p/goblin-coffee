import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosting (Phase 9): build with NEXT_OUTPUT=standalone for a Docker-ready server.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
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
