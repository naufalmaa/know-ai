import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Create S3 client for MinIO
function createS3Client() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
    }
  })
}


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
  app.post('/api/drive/folder', async (req, rep) => {
    const { name, parent_id } = req.body as any
    
    if (!name || !name.trim()) {
      return rep.code(400).send({ error: 'Folder name is required' })
    }
    
    try {
      // Use a demo user UUID that should exist in the users table
      const userId = '550e8400-e29b-41d4-a716-446655440000'
      
      const r = await db.query(
        'insert into folders(name,parent_id,owner_id) values($1,$2,$3) returning *',
        [name.trim(), parent_id || null, userId]
      )
      
      return r.rows[0]
    } catch (error: any) {
      console.error('Folder creation error:', error)
      return rep.code(500).send({ error: 'Failed to create folder', details: error.message })
    }
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

  // Delete folder
  app.delete('/api/drive/folder/:id', async (req, rep) => {
    const { id } = req.params as any
    
    // Check if folder has children
    const children = await db.query(
      'select count(*) as count from folders where parent_id = $1',
      [id]
    )
    const files = await db.query(
      'select count(*) as count from files where folder_id = $1',
      [id]
    )
    
    if (parseInt(children.rows[0].count) > 0 || parseInt(files.rows[0].count) > 0) {
      return rep.code(409).send({ error: 'Cannot delete non-empty folder' })
    }
    
    await db.query('delete from folders where id = $1', [id])
    return rep.code(204).send()
  })

  // Rename file
  app.patch('/api/files/:id', async (req) => {
    const { id } = req.params as any
    const { filename } = req.body as any
    const r = await db.query('update files set filename=$1 where id=$2 returning *', [filename, id])
    return r.rows[0]
  })

  // Delete file
  app.delete('/api/files/:id', async (req, rep) => {
    const { id } = req.params as any
    
    try {
      // Get file info first to get S3 key
      const fileQuery = await db.query('select s3_key from files where id = $1', [id])
      
      if (fileQuery.rowCount === 0) {
        return rep.code(404).send({ error: 'File not found' })
      }
      
      const s3Key = fileQuery.rows[0].s3_key
      
      // Delete from database first
      await db.query('delete from files where id = $1', [id])
      
      // Delete from MinIO/S3 if s3_key exists
      if (s3Key) {
        try {
          const s3 = createS3Client()
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_RAW!,
            Key: s3Key
          })
          const result = await s3.send(deleteCommand)
        } catch (s3Error) {
          console.error('Failed to delete from S3:', s3Error)
          // Don't fail the whole operation if S3 delete fails
        }
      }
      
      return rep.code(204).send()
    } catch (error) {
      console.error('Delete file error:', error)
      return rep.code(500).send({ error: 'Failed to delete file' })
    }
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
