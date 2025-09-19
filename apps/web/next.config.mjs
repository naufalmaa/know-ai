/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const fastifyPort = process.env.FASTIFY_PORT ?? "4001"

    return [
      { source: "/api/:path*", destination: `http://127.0.0.1:${fastifyPort}/api/:path*` }
    ]
  }
}
export default nextConfig
