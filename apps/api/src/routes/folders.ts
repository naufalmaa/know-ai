import { FastifyInstance } from 'fastify'
import { db } from '../db'

export async function routes(app: FastifyInstance) {
  app.post('/api/folders', async (req) => {
    const { name, parent_id } = req.body as any
    const user = { id: 'demo-user' }
    const r = await db.query(
      'insert into folders(name,parent_id,owner_id) values($1,$2,$3) returning *',
      [name, parent_id || null, user.id]
    )
    return r.rows[0]
  })

  app.get('/api/files', async () => {
    const rows = await db.query(`
      select f.*, m.basin, m.block, m.well_name, m.doc_type, m.indexed
      from files f left join file_metadata m on m.file_id=f.id
      order by f.created_at desc limit 200`)
    return rows.rows
  })
}
