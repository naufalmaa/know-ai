import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'node:crypto'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  }
})

export async function routes(app: FastifyInstance) {
  app.post('/api/uploads/presign', async (req) => {
    const { filename, mime_type, folder_id } = req.body as any
    const user = { id: 'demo-user' }
    const fileId = crypto.randomUUID()
    const key = `tenant/${user.id}/${new Date().getFullYear()}/${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${fileId}/${filename}`

    const presign = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET_RAW!,
      Key: key,
      Conditions: [['content-length-range', 0, 1_000_000_000]]
    })

    const res = await db.query(
      `insert into files(id,folder_id,owner_id,filename,mime_type,size,s3_key)
       values($1,$2,$3,$4,$5,$6,$7) returning *`,
      [fileId, folder_id || null, user.id, filename, mime_type || null, 0, key]
    )

    return { file: res.rows[0], presign }
  })

  app.post('/api/uploads/complete', async (req) => {
    const { file_id, size, checksum } = req.body as any
    const r = await db.query('update files set size=$1, checksum=$2 where id=$3 returning *', [
      size,
      checksum,
      file_id
    ])

    // Signed GET URL for ingest (valid 10 minutes)
    const signedGet = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET_RAW!, Key: r.rows[0].s3_key }),
      { expiresIn: 600 }
    )

    // Fire-and-forget ingest
    fetch(`http://127.0.0.1:${process.env.INGEST_PORT || 9009}/ingest/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id,
        s3_signed_url: signedGet,
        filename: r.rows[0].filename,
        checksum,
        mime_type: r.rows[0].mime_type
      })
    }).catch(() => {})

    return r.rows[0]
  })

  // (Optional) fetch signed URL for preview
  app.get('/api/files/:id/signed-get', async (req, rep) => {
    const { id } = req.params as any
    const q = await db.query('select s3_key from files where id=$1', [id])
    if (!q.rowCount) return rep.notFound()
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET_RAW!, Key: q.rows[0].s3_key }),
      { expiresIn: 600 }
    )
    return { url }
  })
}
