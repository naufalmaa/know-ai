import { FastifyInstance } from 'fastify'
import { db } from '../db'


export async function routes(app: FastifyInstance) {
  // List children (files + folders) of a folder (or root)
  app.get('/api/drive/children', async (req) => {
    const { folder_id } = req.query as any
    const folders = await db.query(
      `select id, name, parent_id, created_at from folders
       where coalesce(parent_id::text,'root') = coalesce($1,'root') order by name asc`,
      [folder_id || null]
    )
    const files = await db.query(
      `select f.id, f.filename, f.mime_type, f.size, f.created_at,
              m.doc_type, m.basin, m.block, m.indexed
       from files f left join file_metadata m on m.file_id=f.id
       where coalesce(f.folder_id::text,'root') = coalesce($1,'root')
       order by f.filename asc`,
      [folder_id || null]
    )
    return { folders: folders.rows, files: files.rows }
  })

  // Breadcrumbs up to root
  app.get('/api/drive/breadcrumbs/:id', async (req, rep) => {
    const { id } = req.params as any
    const nodes: any[] = []
    let cur = id
    while (cur) {
      const r = await db.query('select id, name, parent_id from folders where id=$1', [cur])
      if (!r.rowCount) break
      nodes.push(r.rows[0])
      cur = r.rows[0].parent_id
    }
    return nodes.reverse()
  })

  // Create folder
  app.post('/api/drive/folder', async (req) => {
    const { name, parent_id } = req.body as any
    const user = { id: 'demo-user' }
    const r = await db.query(
      'insert into folders(name,parent_id,owner_id) values($1,$2,$3) returning *',
      [name, parent_id || null, user.id]
    )
    return r.rows[0]
  })

  // Rename folder
  app.patch('/api/drive/folder/:id', async (req) => {
    const { id } = req.params as any
    const { name } = req.body as any
    const r = await db.query('update folders set name=$1 where id=$2 returning *', [name, id])
    return r.rows[0]
  })

  // Move file
  app.patch('/api/drive/file/:id/move', async (req) => {
    const { id } = req.params as any
    const { folder_id } = req.body as any
    const r = await db.query('update files set folder_id=$1 where id=$2 returning *', [folder_id || null, id])
    return r.rows[0]
  })

  // Quick search
  app.get('/api/drive/search', async (req) => {
    const { q } = req.query as any
    const rows = await db.query(
      `select f.id, f.filename, f.mime_type, m.doc_type, m.basin, m.block
       from files f left join file_metadata m on m.file_id=f.id
       where f.filename ilike '%'||$1||'%' order by f.created_at desc limit 100`,
      [q || '']
    )
    return rows.rows
  })
}
