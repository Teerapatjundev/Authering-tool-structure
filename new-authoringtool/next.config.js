/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-konva', 'konva'],
  turbopack: {},
}

module.exports = nextConfig
