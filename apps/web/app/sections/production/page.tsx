'use client'
import { useEffect, useState } from 'react'
import PlotCard from '@/components/PlotCard'
import { api } from '@/lib/api'

export default function Production(){
  const [data,setData]=useState<any|null>(null)
  const [groupby,setGroupby]=useState('month')
  const [block,setBlock]=useState<string>('')

  useEffect(()=>{
    const p=new URLSearchParams({ groupby })
    if(block) p.set('block', block)
    fetch(api(`/api/metrics/aceh/production?${p}`)).then(r=>r.json()).then(setData)
  },[groupby,block])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Production Dashboard</h2>
      <div className="flex gap-3 mb-3">
        <select className="border rounded px-2 py-1" value={groupby} onChange={e=>setGroupby(e.target.value)}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        <input className="border rounded px-2 py-1" placeholder="Block (optional)" value={block} onChange={e=>setBlock(e.target.value)} />
      </div>
      {data && <PlotCard spec={{
        title: `Oil & Gas by ${data.groupby}${block?` — ${block}`:''}`,
        traces: [
          { x: data.dates, y: data.oil, mode: 'lines', name: 'Oil (bbl)' },
          { x: data.dates, y: data.gas, mode: 'lines', name: 'Gas (mscf)' }
        ],
        layout: { xaxis_title: 'Date', yaxis_title: 'Value', legend: true }
      }}/>}
    </div>
  )
}
