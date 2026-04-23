/** @type {import('next').NextConfig} */
const config = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

module.exports = config;