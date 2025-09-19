'use client'
// import Plotly from 'plotly.js-dist-min'
import { useEffect, useRef } from 'react'

type PlotlyModule = typeof import('plotly.js-dist-min')

export default function PlotCard({ spec }:{ spec:any }){
  const ref = useRef<HTMLDivElement|null>(null)
  const plotlyRef = useRef<PlotlyModule|null>(null)
  useEffect(()=>{
    // if(!ref.current) return
    const element = ref.current
    if(!element) return
    let isActive = true
    const traces = (spec.traces||[]).map((t:any)=>({x:t.x, y:t.y, mode:t.mode||'lines', name:t.name}))
    const layout = {
      title: spec.title || '',
      xaxis: { title: spec.layout?.xaxis_title || '' },
      yaxis: { title: spec.layout?.yaxis_title || '' },
      showlegend: spec.layout?.legend ?? true,
      margin: { t:40, r:20, b:40, l:50 }
    }
    // Plotly.newPlot(ref.current, traces, layout, {displaylogo:false, responsive:true})
    // return ()=>{ if(ref.current) Plotly.purge(ref.current) }
    const ensurePlot = async () => {
      if(!plotlyRef.current){
        const mod = await import('plotly.js-dist-min')
        if(!isActive) return
        plotlyRef.current = (mod.default ?? mod) as PlotlyModule
      }
      const plotly = plotlyRef.current
      if(!plotly) return
      await plotly.newPlot(element, traces, layout, {displaylogo:false, responsive:true})
    }
    ensurePlot()
    return ()=>{
      isActive = false
      if(!element) return
      const plotly = plotlyRef.current
      if(plotly) plotly.purge(element)
    }
  },[spec])
  return <div className="border rounded p-2"><div ref={ref} style={{width:'100%',height:380}}/></div>
}