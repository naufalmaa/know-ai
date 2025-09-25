import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'node:crypto'

// Create S3 client function to ensure environment variables are loaded
function createS3Client() {
  console.log('Creating S3 client with config:', {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    bucket: process.env.S3_BUCKET_RAW
  })
  
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true, // Important for MinIO
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
    }
  })
}

export async function routes(app: FastifyInstance) {
  // Debug endpoint to check S3 configuration
  app.get('/api/debug/s3-config', async (req) => {
    return {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      bucket: process.env.S3_BUCKET_RAW,
      hasSecretKey: !!process.env.S3_SECRET_ACCESS_KEY
    }
  })

  app.post('/api/uploads/presign', async (req, reply) => {
    try {
      console.log('Environment check:', {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        bucket: process.env.S3_BUCKET_RAW
      })

      const { filename, mime_type, folder_id } = req.body as any
      const userId = '550e8400-e29b-41d4-a716-446655440000' // Demo user UUID
      const fileId = crypto.randomUUID()
      const key = `tenant/${userId}/${new Date().getFullYear()}/${(new Date().getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${fileId}/${filename}`

      console.log('Creating presigned POST for key:', key)
      console.log('Using file ID:', fileId)
      console.log('Using user ID:', userId)

      const s3 = createS3Client()
      const presign = await createPresignedPost(s3, {
        Bucket: process.env.S3_BUCKET_RAW!,
        Key: key,
        Conditions: [['content-length-range', 0, 1_000_000_000]]
      })

      const res = await db.query(
        `insert into files(id,folder_id,owner_id,filename,mime_type,size,s3_key)
         values($1,$2,$3,$4,$5,$6,$7) returning *`,
        [fileId, folder_id || null, userId, filename, mime_type || null, 0, key]
      )

      console.log('File inserted into database:', res.rows[0])
      return { file: res.rows[0], presign }
    } catch (error) {
      console.error('Presign error:', error)
      reply.code(500).send({ error: 'Failed to create presigned URL', details: error.message })
    }
  })

  app.post('/api/uploads/complete', async (req, reply) => {
    const { file_id, size, checksum } = req.body as any
    
    try {
      const r = await db.query('update files set size=$1, checksum=$2 where id=$3 returning *', [
        size,
        checksum,
        file_id
      ])

      // Check if file was found and updated
      if (!r.rowCount || !r.rows[0]) {
        return reply.code(404).send({ error: 'File not found', file_id })
      }

      const fileRecord = r.rows[0] as any
      
      // Ensure required fields are present
      if (!fileRecord.s3_key) {
        console.error('File record missing s3_key:', fileRecord)
        return reply.code(500).send({ error: 'File record incomplete - missing s3_key' })
      }

      // Signed GET URL for ingest (valid 10 minutes)
      const s3 = createS3Client()
      const signedGet = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET_RAW!, Key: fileRecord.s3_key }),
        { expiresIn: 600 }
      )

      // Fire-and-forget ingest and processing pipeline
      const processingPromises = [
        // Original ingest service
        fetch(`http://127.0.0.1:${process.env.INGEST_PORT || 9009}/ingest/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id,
            s3_signed_url: signedGet,
            filename: fileRecord.filename,
            checksum,
            mime_type: fileRecord.mime_type
          })
        }).catch(err => {
          console.log('Ingest service unavailable:', err.message)
        }),
        
        // // Parser service for content extraction
        // fetch(`http://127.0.0.1:${process.env.PARSER_PORT || 9008}/parse/file`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     file_id,
        //     s3_signed_url: signedGet,
        //     filename: fileRecord.filename,
        //     mime_type: fileRecord.mime_type
        //   })
        // }).catch(err => {
        //   console.log('Parser service unavailable:', err.message)
        // }),
        
        // Agno service for AI processing and chunking
        fetch(`http://127.0.0.1:${process.env.AGNO_PORT || 9010}/process/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id,
            s3_signed_url: signedGet,
            filename: fileRecord.filename,
            mime_type: fileRecord.mime_type
          })
        }).catch(err => {
          console.log('Agno service unavailable:', err.message)
        })
      ]
      
      // Update file status to processing
      await db.query('update files set processing_status = $1 where id = $2', [
        'processing',
        file_id
      ])

      return fileRecord
    } catch (error: any) {
      console.error('Upload complete error:', error)
      return reply.code(500).send({ error: 'Failed to complete upload', details: error.message })
    }
  })

  // Get file processing status
  app.get('/api/files/:id/status', async (req, rep) => {
    const { id } = req.params as any
    const q = await db.query(`
      select f.id, f.filename, f.processing_status, f.created_at,
             m.doc_type, m.basin, m.block, m.indexed, m.chunks_count
      from files f 
      left join file_metadata m on m.file_id = f.id 
      where f.id = $1
    `, [id])
    
    if (!q.rowCount) return rep.notFound()
    return q.rows[0]
  })

  // (Optional) fetch signed URL for preview
  app.get('/api/files/:id/signed-get', async (req, rep) => {
    const { id } = req.params as any
    const q = await db.query('select s3_key from files where id=$1', [id])
    if (!q.rowCount) return rep.notFound()
    const s3 = createS3Client()
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET_RAW!, Key: (q.rows[0] as any).s3_key }),
      { expiresIn: 600 }
    )
    return { url }
  })
}
