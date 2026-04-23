const config = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  webpack: (config) => {
    config.externals.push("@prisma/client");
    return config;
  },
};

module.exports = config;