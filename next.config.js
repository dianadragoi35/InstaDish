/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is stable in Next.js 15, no experimental flag needed
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig