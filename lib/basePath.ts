// Mirrors next.config.ts's basePath: empty locally, "/F16bit" when built for
// GitHub Pages. Needed for manual fetch() calls to /public assets, since Next
// only auto-prefixes paths it controls itself (Link, next/font, metadata).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
