/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Explicitly load environment variables
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:4000',
    NEXT_PUBLIC_CHAT_WS: process.env.NEXT_PUBLIC_CHAT_WS || 'ws://127.0.0.1:8000/ws'
  },
  
  async rewrites() {
    // Use FASTIFY_PORT from environment, with proper fallback to 4000
    const fastifyPort = process.env.FASTIFY_PORT || "4000"
    console.log('[Next.js] API rewrites pointing to port:', fastifyPort)
    console.log('[Next.js] WebSocket URL:', process.env.NEXT_PUBLIC_CHAT_WS || 'ws://127.0.0.1:8000/ws')

    return [
      { source: "/api/:path*", destination: `http://127.0.0.1:${fastifyPort}/api/:path*` }
    ]
  }
}
export default nextConfig
