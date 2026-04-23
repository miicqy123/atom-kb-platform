import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.externals.push("@prisma/client");
    return config;
  },
};

export default config;