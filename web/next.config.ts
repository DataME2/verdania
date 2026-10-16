import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A package-lock.json higher up the disk must not be mistaken for the workspace root.
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  // The Content-Security-Policy needs a per-request nonce, so middleware.ts sets it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
