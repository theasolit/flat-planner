import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: isGitHubPagesBuild ? "export" : undefined,
  basePath: isGitHubPagesBuild ? process.env.NEXT_BASE_PATH ?? "" : "",
  trailingSlash: isGitHubPagesBuild,
  cacheComponents: !isGitHubPagesBuild,
  partialPrefetching: !isGitHubPagesBuild,
  allowedDevOrigins: ["192.168.178.69"],
  turbopack: {
    rules: {
      "**/globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
