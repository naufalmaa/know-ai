import { FastifyInstance } from 'fastify'
import { db } from '../db'

export async function routes(app: FastifyInstance) {
  app.post('/api/files/:id/metadata', async (req) => {
    const { id } = req.params as any
    const p = req.body as any
    const r = await db.query(
      `insert into file_metadata(file_id,doc_type,basin,block,well_name,survey_type,formation)
       values($1,$2,$3,$4,$5,$6,$7)
       on conflict(file_id) do update set
         doc_type=excluded.doc_type, basin=excluded.basin, block=excluded.block,
         well_name=excluded.well_name, survey_type=excluded.survey_type, formation=excluded.formation,
         updated_at=now()
       returning *`,
      [id, p.doc_type, p.basin, p.block, p.well_name, p.survey_type, p.formation]
    )
    return r.rows[0]
  })

  app.get('/api/search', async (req) => {
    const { q, basin, block, doc_type } = req.query as any
    const rows = await db.query(
      `select f.*, m.* from files f join file_metadata m on m.file_id=f.id
       where ($1::text is null or f.filename ilike '%'||$1||'%')
         and ($2::text is null or m.basin=$2)
         and ($3::text is null or m.block=$3)
         and ($4::text is null or m.doc_type=$4)
       order by f.created_at desc limit 200`,
      [q || null, basin || null, block || null, doc_type || null]
    )
    return rows.rows
  })
}
