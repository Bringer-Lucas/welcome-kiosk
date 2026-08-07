import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Not `import.meta.dirname` — that needs Node 20.11+, and a build image with an
// older Node would leave it undefined and fail here rather than somewhere
// legible.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Without this Turbopack walks up looking for a lockfile and lands on the
  // home directory, which it then refuses to use as the project root.
  turbopack: { root: projectRoot },

  // The kiosk runs on an iPad over the office Wi-Fi; nothing here needs an
  // image CDN, and employee photos are served from our own /api routes.
  images: { unoptimized: true },
};

export default nextConfig;
