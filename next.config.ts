import type { NextConfig } from "next";

// Export estático (GitHub Pages / Cloudflare Pages). No GitHub Pages sem domínio
// próprio o site fica em /<repo>, então o workflow define NEXT_PUBLIC_BASE_PATH.
// Com domínio próprio, use BASE_PATH="/" (vira "").
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
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
