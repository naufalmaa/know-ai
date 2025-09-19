import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { parse } from 'csv-parse/sync'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }
})

export async function routes(app: FastifyInstance) {
  // POST /api/admin/import/csv { file_id }
  app.post('/api/admin/import/csv', async (req, rep) => {
    const { file_id } = req.body as any
    if (!file_id) return rep.badRequest('file_id required')
    const q = await db.query('select s3_key, mime_type from files where id=$1', [file_id])
    if (!q.rowCount) return rep.notFound('file not found')
    const key = q.rows[0].s3_key
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET_RAW!, Key: key }), { expiresIn: 600 })
    const res = await fetch(url)
    if (!res.ok) return rep.badGateway('signed get failed')
    const text = await res.text()

    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    // expected columns in your sample csv:
    // DATEPRD, WELL_BORE_CODE, BLOCK, ON_STREAM_HRS, AVG_DOWNHOLE_PRESSURE, AVG_DP_TUBING,
    // AVG_WHP_P, AVG_WHT_P, DP_CHOKE_SIZE, BORE_OIL_VOL, BORE_GAS_VOL, BORE_WAT_VOL, BORE_WI_VOL, FLOW_KIND
    const BATCH = 1000
    for (let i = 0; i < records.length; i += BATCH) {
      const chunk = records.slice(i, i + BATCH)
      const values: any[] = []
      const placeholders = chunk.map((r: any, idx: number) => {
        const d = new Date(r.DATEPRD)
        values.push(
          d.toISOString().slice(0,10),
          r.WELL_BORE_CODE || '',
          r.BLOCK || '',
          num(r.ON_STREAM_HRS),
          num(r.AVG_DOWNHOLE_PRESSURE),
          num(r.AVG_DP_TUBING),
          num(r.AVG_WHP_P),
          num(r.AVG_WHT_P),
          num(r.DP_CHOKE_SIZE),
          num(r.BORE_OIL_VOL),
          num(r.BORE_GAS_VOL),
          num(r.BORE_WAT_VOL),
          num(r.BORE_WI_VOL),
          r.FLOW_KIND || '',
          'demo'
        )
        const o = idx*15
        return `($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10},$${o+11},$${o+12},$${o+13},$${o+14},$${o+15})`
      }).join(',')
      await db.query(
        `insert into well_daily(ts,well_bore_code,block,on_stream_hrs,avg_downhole_pressure,avg_dp_tubing,avg_whp_p,avg_wht_p,dp_choke_size,bore_oil_vol,bore_gas_vol,bore_wat_vol,bore_wi_vol,flow_kind,tenant_id)
         values ${placeholders}`, values)
    }

    return { ok: true, rows: records.length }
  })

  function num(x: any) { const v = Number(x); return Number.isFinite(v) ? v : null }

  // POST /api/admin/import/geojson { type: "blocks"|"wells", data: <geojson> }
  app.post('/api/admin/import/geojson', async (req, rep) => {
    const { type, data } = req.body as any
    if (!type || !data?.features) return rep.badRequest('type and geojson data required')

    if (type === 'blocks') {
      for (const f of data.features) {
        await db.query(
          `insert into geo_blocks(name, props, geom) values($1,$2,$3)
           on conflict (name) do update set props=excluded.props, geom=excluded.geom`,
          [f.properties?.name, f.properties || {}, f.geometry]
        )
      }
      return { ok: true, count: data.features.length }
    }

    if (type === 'wells') {
      for (const f of data.features) {
        await db.query(
          `insert into geo_wells(name, block, props, geom) values($1,$2,$3,$4)
           on conflict (name) do update set block=excluded.block, props=excluded.props, geom=excluded.geom`,
          [f.properties?.name, f.properties?.block || null, f.properties || {}, f.geometry]
        )
      }
      return { ok: true, count: data.features.length }
    }

    return rep.badRequest('unknown type')
  })
}
