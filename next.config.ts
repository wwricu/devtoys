import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Every tool route is prerendered, so the data the client router caches can
  // only change with a deploy, which needs a reload anyway. The 300 s default
  // evicts a warmed route on a hard miss: after five minutes, each switch pays
  // the RSC round trip again.
  experimental: {
    staleTimes: {
      static: 3600,
    },
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
