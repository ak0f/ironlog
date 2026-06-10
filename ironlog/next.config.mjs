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
  // Lint is run separately via `npm run lint`; don't block the static build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
