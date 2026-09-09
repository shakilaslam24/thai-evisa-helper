import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 * The CSP is intentionally strict: the site ships no third-party scripts by
 * default. Analytics hosts are only reachable because an administrator opts in
 * by saving a GA4 / GTM / Meta Pixel ID in Global Settings.
 */
const ANALYTICS_SCRIPT_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://connect.facebook.net",
];
const ANALYTICS_CONNECT_HOSTS = [
  ...ANALYTICS_SCRIPT_HOSTS,
  "https://analytics.google.com",
  "https://region1.google-analytics.com",
  "https://www.facebook.com",
];

// React's development build needs eval() for its debugging features. It is
// never permitted in a production response.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${ANALYTICS_SCRIPT_HOSTS.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${ANALYTICS_CONNECT_HOSTS.join(" ")}`,
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 828, 1080, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
  },
  experimental: {
    optimizePackageImports: ["zod"],
  },
  // This project keeps its own docs in docs/ and CLAUDE.md is not wanted here.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Uploaded media is immutable: filenames are content-addressed.
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
