/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-konva", "konva"],
  webpack: (config, { isServer }) => {
    // Fix for Konva canvas module not found error
    if (isServer) {
      config.externals = [...(config.externals || []), { canvas: "canvas" }];
    }
    return config;
  },
};

module.exports = nextConfig;
