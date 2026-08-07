import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this Turbopack walks up looking for a lockfile and lands on the
  // home directory, which it then refuses to use as the project root.
  turbopack: { root: path.resolve(import.meta.dirname) },

  // The kiosk runs on an iPad over the office Wi-Fi; nothing here needs an
  // image CDN, and employee photos are served from our own /api routes.
  images: { unoptimized: true },
};

export default nextConfig;
