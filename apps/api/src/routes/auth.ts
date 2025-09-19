import { FastifyInstance } from 'fastify'
import { db } from '../db'

export async function routes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, rep) => {
    const { email, password } = req.body as any
    const r = await db.query(
      'insert into users(email,password_hash,role) values($1,$2,$3) returning id,email,role',
      [email, password, 'user']
    )
    rep.setCookie('token', r.rows[0].id, { httpOnly: true, sameSite: 'lax' })
    return r.rows[0]
  })

  app.post('/api/auth/login', async (req, rep) => {
    const { email, password } = req.body as any
    const r = await db.query('select id,email,role,password_hash from users where email=$1', [email])
    if (!r.rowCount || r.rows[0].password_hash !== password) return rep.unauthorized()
    rep.setCookie('token', r.rows[0].id, { httpOnly: true, sameSite: 'lax' })
    return { id: r.rows[0].id, email, role: r.rows[0].role }
  })

  app.get('/api/auth/me', async (req) => ({ id: (req as any).cookies?.token || 'anon', role: 'user' }))
}
