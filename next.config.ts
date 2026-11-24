import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modèle de rendu classique : les pages connectées lisent les cookies à chaque requête.
  cacheComponents: false,
  // Produit aussi un serveur autonome (.next/standalone) qui se lance sans npm install.
  output: "standalone",
  outputFileTracingIncludes: {
    "/installation": ["./supabase/schema.sql"],
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
