import type { NextConfig } from "next";

// Set by the GitHub Pages Actions workflow so the built site's internal
// links/assets resolve under https://<user>.github.io/<repo>/. Empty locally,
// so `npm run dev` / `npm run build` keep working at the domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
};

export default nextConfig;
