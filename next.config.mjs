import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local-first: fully static export, no server runtime required.
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Trailing slash keeps static hosting / offline routing predictable.
  trailingSlash: true,
  // Pin the workspace root so a stray parent lockfile can't misdirect the build.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
