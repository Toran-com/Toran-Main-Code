import type { NextConfig } from "next";

// Sent with every page and file. Other sites can't show Toran inside a
// frame (so nobody can trick a committee member into pressing a button
// they can't see), browsers don't guess file types, other sites are told
// only "toran" when someone follows a link, and pages can ask for your
// location (for "Near me") but not your camera or microphone. A full
// content security policy would need a fresh code on every page, which
// would stop pages being saved ahead; React already escapes what people
// type, and the tests check structured data is escaped too.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
