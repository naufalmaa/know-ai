import { FastifyInstance } from 'fastify'
export async function routes(app: FastifyInstance) {
  app.get('/api/health', async () => ({ ok: true, service: 'know-ai-api' }))
}
