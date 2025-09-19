'use client'
import { useEffect, useState } from 'react'

const PARSERS = process.env.NEXT_PUBLIC_PARSERS_BASE || 'http://127.0.0.1:9010'

export default function Technical(){
  const [lasUrl,setLasUrl]=useState<string>('')
  const [segyUrl,setSegyUrl]=useState<string>('')
  const [las,setLas]=useState<any|null>(null)

  useEffect(()=>{
    (async()=>{
      if(!lasUrl) return
      const r = await fetch(`${PARSERS}/las/curve-json?url=${encodeURIComponent(lasUrl)}`)
      if(r.ok) setLas(await r.json())
    })()
  },[lasUrl])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Technical Dashboard</h2>

      {/* LAS viewer */}
      <div className="border rounded p-4 mb-6">
        <div className="font-medium mb-2">LAS Viewer</div>
        <div className="flex gap-2">
          <input value={lasUrl} onChange={e=>setLasUrl(e.target.value)} className="border p-2 rounded flex-1"
                 placeholder="Paste signed URL to a LAS file (try one you uploaded)"/>
          <button onClick={()=>setLasUrl(lasUrl)} className="px-3 py-2 border rounded">Load</button>
        </div>
        {las && (
          <div className="mt-3">
            <div className="text-sm text-gray-500">Curves: {las.curves.join(', ')}</div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              {Object.entries(las.sampled).map(([k,v]:any)=>(
                <div key={k} className="border rounded p-2">
                  <div className="text-xs text-gray-500">{k}</div>
                  <svg width="280" height="120">
                    {/* super light-weight polyline (normalize) */}
                    {(()=>{
                      const arr=v as number[]
                      const max=Math.max(...arr.filter(Number.isFinite)), min=Math.min(...arr.filter(Number.isFinite))
                      const scale=(x:number)=> (max===min?60: (110 - (x-min)/(max-min)*100))
                      const pts=arr.slice(0,200).map((y,i)=>`${i*1.4},${scale(y)}`).join(' ')
                      return <polyline points={pts} stroke="currentColor" fill="none" strokeWidth="1"/>
                    })()}
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEG-Y quicklook */}
      <div className="border rounded p-4">
        <div className="font-medium mb-2">SEG-Y Quicklook</div>
        <div className="flex gap-2">
          <input value={segyUrl} onChange={e=>setSegyUrl(e.target.value)} className="border p-2 rounded flex-1"
                 placeholder="Paste signed URL to a SEG-Y file"/>
          <a className={`px-3 py-2 border rounded ${!segyUrl?'pointer-events-none opacity-50':''}`}
             href={`${PARSERS}/segy/quicklook.png?url=${encodeURIComponent(segyUrl)}`} target="_blank">Open PNG</a>
        </div>
      </div>
    </div>
  )
}
