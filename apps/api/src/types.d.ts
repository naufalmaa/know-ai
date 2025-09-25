// Type declarations for Fastify request extensions
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      user_id: string
      email: string
      role: string
      first_name: string
      last_name: string
      is_active: boolean
    }
  }
  
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
    requirePermission: (permission: string) => (req: FastifyRequest, rep: FastifyReply) => Promise<any>
  }
}