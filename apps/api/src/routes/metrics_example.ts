import { FastifyInstance } from 'fastify'
import { db } from '../db'

function sanitizeGroupBy(g: string | undefined) {
  return (g === 'day' || g === 'week' || g === 'month') ? g : 'month'
}

export async function routes(app: FastifyInstance) {
  // GET /api/metrics/production?start=YYYY-MM-DD&end=YYYY-MM-DD&groupby=day|week|month
  app.get('/api/metrics/production', async (req, rep) => {
    const q = req.query as any
    const groupby = sanitizeGroupBy(q.groupby)
    const start = (q.start && String(q.start)) || '2024-01-01'
    const end   = (q.end && String(q.end)) || new Date().toISOString().slice(0,10)

    // Build safe SQL for date_trunc precision (can't parametrize keyword)
    const precision = groupby // already sanitized
    const sql = `
      with g as (
        select date_trunc('${precision}', ts::timestamp) as bucket,
               avg(oil_bopd) as oil, avg(gas_mmscfd) as gas
        from production_timeseries
        where ts >= $1::date and ts < $2::date and tenant_id='demo'
        group by 1
        order by 1
      )
      select bucket::date as ts, oil::float8, gas::float8 from g
    `
    const r = await db.query(sql, [start, end])

    return {
      start, end, groupby,
      dates: r.rows.map((x:any)=>x.ts),
      oil:   r.rows.map((x:any)=>x.oil),
      gas:   r.rows.map((x:any)=>x.gas)
    }
  })
}
