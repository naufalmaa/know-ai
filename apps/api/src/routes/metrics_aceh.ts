import { FastifyInstance } from 'fastify'
import { db } from '../db'

function gb(s?: string) { return (s==='day'||s==='week'||s==='month') ? s : 'month' }

export async function routes(app: FastifyInstance) {
  // GET /api/metrics/aceh/production?start=YYYY-MM-DD&end=YYYY-MM-DD&groupby=month&block=&well=
  app.get('/api/metrics/aceh/production', async (req) => {
    const q = req.query as any
    const groupby = gb(q.groupby)
    const start = (q.start || '2007-01-01')
    const end   = (q.end   || new Date().toISOString().slice(0,10))
    const block = q.block || null
    const well  = q.well  || null
    const precision = groupby

    const sql = `
      with d as (
        select date_trunc('${precision}', ts::timestamp) as bucket,
               sum(bore_oil_vol) as oil,
               sum(bore_gas_vol) as gas,
               sum(bore_wat_vol) as water
        from well_daily
        where ts >= $1::date and ts < $2::date
          and ($3::text is null or block = $3)
          and ($4::text is null or well_bore_code = $4)
          and tenant_id='demo'
        group by 1
        order by 1
      )
      select bucket::date as ts, oil::float8, gas::float8, water::float8 from d
    `
    const r = await db.query(sql, [start, end, block, well])
    return {
      start, end, groupby, block, well,
      dates: r.rows.map((x:any)=>x.ts),
      oil:   r.rows.map((x:any)=>x.oil||0),
      gas:   r.rows.map((x:any)=>x.gas||0),
      water: r.rows.map((x:any)=>x.water||0)
    }
  })

  // GET /api/metrics/aceh/top-wells?metric=oil|gas|water&start=&end=&limit=10
  app.get('/api/metrics/aceh/top-wells', async (req) => {
    const q = req.query as any
    const metric = (q.metric==='gas'?'bore_gas_vol': q.metric==='water'?'bore_wat_vol':'bore_oil_vol')
    const start = (q.start || '2007-01-01')
    const end   = (q.end   || new Date().toISOString().slice(0,10))
    const limit = Math.min(Number(q.limit||10), 50)
    const r = await db.query(`
      select well_bore_code as well, block,
             sum(${metric})::float8 as value
      from well_daily
      where ts >= $1::date and ts < $2::date and tenant_id='demo'
      group by 1,2
      order by value desc
      limit $3
    `, [start, end, limit])
    return { metric, start, end, items: r.rows }
  })

  // GET /api/metrics/map → blocks+wells with aggregated totals for choropleth / bubbles
  app.get('/api/metrics/map', async () => {
    const blocks = await db.query(`
      select b.name, b.props, b.geom,
             coalesce(sum(w.bore_oil_vol),0)::float8 as oil,
             coalesce(sum(w.bore_gas_vol),0)::float8 as gas,
             coalesce(sum(w.bore_wat_vol),0)::float8 as water
      from geo_blocks b
      left join well_daily w on w.block = b.name and w.tenant_id='demo'
      group by b.name, b.props, b.geom
    `)
    const wells = await db.query(`
      select g.name, g.block, g.props, g.geom,
             coalesce(sum(w.bore_oil_vol),0)::float8 as oil,
             coalesce(sum(w.bore_gas_vol),0)::float8 as gas
      from geo_wells g
      left join well_daily w on w.well_bore_code = g.name and w.tenant_id='demo'
      group by g.name, g.block, g.props, g.geom
    `)
    return { blocks: blocks.rows, wells: wells.rows }
  })
}
