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

// Is the site actually reachable over https? Two headers below are correct on
// a real domain and actively break a local server, so they follow this rather
// than NODE_ENV — a pre-launch rehearsal runs `next build && next start` on
// http://localhost, which is production mode over plain http.
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

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
  // Rewrites every subresource request to https://. Safari applies it to
  // localhost too (Chrome exempts localhost), so on a local http server it
  // sends every stylesheet, script and image to https://localhost:3000, where
  // there is no certificate — the page then renders as unstyled HTML with
  // broken images. Only meaningful once the site really is on https.
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
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
          // Two years of forced https for this host. Deliberately WITHOUT
          // `includeSubDomains`: DreamFly's CRM runs on a separate subdomain
          // and this site must not change how the browser reaches it. Add the
          // directive only once every subdomain, the CRM included, is on
          // https. `preload` is left off for the same reason — it is a
          // one-way commitment that is slow to undo.
          ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
