import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Every page in this app reads the Supabase session (cookies) and is
  // scoped to the signed-in user/role — there's nothing to statically
  // prerender, so Cache Components' default (require explicit opt-in to
  // dynamic rendering per page) just adds friction here.
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
