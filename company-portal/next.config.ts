import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every route in this app is auth-gated and reads the user's session via
   * cookies(), so it's dynamic by nature — there's no static/marketing
   * surface here for Cache Components / PPR to help with. Disabled rather
   * than sprinkling force-dynamic / Suspense boundaries everywhere to work
   * around a feature this app doesn't benefit from. */
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
