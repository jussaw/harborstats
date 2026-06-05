import type { NextConfig } from "next";

// Baseline security headers applied to every response. HSTS is intentionally
// omitted here — it is set at the Cloudflare edge. The CSP is deliberately a
// baseline (no `script-src`/`style-src`) so Next's RSC/hydration inline scripts
// keep working; a nonce-based `script-src` is a planned Report-Only follow-up.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
