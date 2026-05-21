import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Keep Prisma and native database drivers outside the server bundle
  serverExternalPackages: ["@prisma/client", "pg", "jsdom", "@mozilla/readability", "@neondatabase/serverless", "@prisma/adapter-neon"],
  
  // 2. Updated configuration key for Next.js 16
  turbopack: {
    resolveAlias: {
      ".prisma/client/default": "./node_modules/.prisma/client/default.js",
    },
  },
};

export default nextConfig;