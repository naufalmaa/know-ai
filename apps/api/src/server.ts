// apps/api/src/server.ts

import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { routes as health } from './routes/health'
// CHANGED: Import the middleware functions directly from auth.ts
import { routes as auth, requireAuth, requirePermission } from './routes/auth'
import { routes as users } from './routes/users'
import { routes as folders } from './routes/folders'
import { routes as files } from './routes/files'
import { routes as metadata } from './routes/metadata'
import { routes as drive } from './routes/drive'
import { routes as importRoutes } from './routes/import'
import { routes as metricsExample } from './routes/metrics_example'
import { routes as metricsAceh } from './routes/metrics_aceh'
import { routes as database } from './routes/database'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

// Coba beberapa kandidat lokasi .env agar aman di Windows/monorepo
const candidates = [
  path.resolve(process.cwd(), '../../.env'),
  // path.resolve(__dirname, '../../../.env'),       // apps/api/src → root
  path.resolve(process.cwd(), '.env'),
]
for (const p of candidates) {
  const loaded = dotenv.config({ path: p })
  if (!loaded.error) { console.log('[API] loaded .env from', p); break }
}

console.log('[API] S3_ENDPOINT=', process.env.S3_ENDPOINT, 'S3_REGION=', process.env.S3_REGION)


const app = Fastify({ logger: true })
await app.register(sensible)
await app.register(cookie)
await app.register(cors, { 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev' })

// CHANGED: Decorate the main Fastify instance BEFORE registering any routes.
// This is a more robust pattern that ensures these functions are available everywhere.
app.decorate('requireAuth', requireAuth)
app.decorate('requirePermission', requirePermission)

// Register auth routes first to make middleware available
await app.register(auth)

app.register(health)
app.register(users)
app.register(folders)
app.register(files)
app.register(metadata)
app.register(drive)
app.register(importRoutes)
app.register(metricsExample)
app.register(metricsAceh)
app.register(database)

console.log('FASTIFY PORT=', process.env.FASTIFY_PORT)
// console.log('[API] S3_ENDPOINT=', process.env.S3_ENDPOINT, 'S3_REGION=', process.env.S3_REGION)

const port = Number(process.env.FASTIFY_PORT || 4000)
// paksa IPv4 agar curl 127.0.0.1 berhasil di Windows
const host = process.env.HOST || '0.0.0.0'


await app.register(swagger, {
  openapi: {
    info: { title: 'know-ai API', version: '0.1.0' }
  }
})
await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: false }
})

try {
  await app.listen({ port, host })
  app.log.info(`API listening on http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
