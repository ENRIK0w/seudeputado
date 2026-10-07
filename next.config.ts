import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  // As páginas de parlamentar e votação são geradas sob demanda (ISR) e leem os
  // JSON de data/ em tempo de execução — precisam ir junto no pacote da função.
  outputFileTracingIncludes: {
    "/p/[slug]": ["./data/parlamentares/**/*", "./data/*.json"],
    "/votacoes/[id]": ["./data/votacoes/**/*", "./data/*.json"],
    "/*": ["./data/*.json"],
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
