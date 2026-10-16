import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A package-lock.json higher up the disk must not be mistaken for the workspace root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
