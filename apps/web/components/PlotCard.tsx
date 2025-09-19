'use client'
import Plotly from 'plotly.js-dist-min'
import { useEffect, useRef } from 'react'

export default function PlotCard({ spec }:{ spec:any }){
  const ref = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{
    if(!ref.current) return
    const traces = (spec.traces||[]).map((t:any)=>({x:t.x, y:t.y, mode:t.mode||'lines', name:t.name}))
    const layout = {
      title: spec.title || '',
      xaxis: { title: spec.layout?.xaxis_title || '' },
      yaxis: { title: spec.layout?.yaxis_title || '' },
      showlegend: spec.layout?.legend ?? true,
      margin: { t:40, r:20, b:40, l:50 }
    }
    Plotly.newPlot(ref.current, traces, layout, {displaylogo:false, responsive:true})
    return ()=>{ if(ref.current) Plotly.purge(ref.current) }
  },[spec])
  return <div className="border rounded p-2"><div ref={ref} style={{width:'100%',height:380}}/></div>
}
