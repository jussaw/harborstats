import type { NextConfig } from "next";

// Baseline security headers applied to every response. HSTS is set here at the
// app so it holds regardless of edge config (the Cloudflare edge may also set
// it; a duplicate is harmless). The CSP is deliberately a baseline (no
// `script-src`/`style-src`) so Next's RSC/hydration inline scripts keep working;
// a nonce-based `script-src` is a planned Report-Only follow-up.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
