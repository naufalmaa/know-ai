'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PlotCard from './PlotCard'
import TableCard from './TableCard'

const WS = process.env.NEXT_PUBLIC_CHAT_WS!

type Chunk = { text:string, meta:{ file_id:string, page:number, section:string } }
type Frame =
  | { type:'result', payload:{ objects: Chunk[] } }
  | { type:'answer', payload:string }
  | { type:'viz', payload:any }
  | { type:'table', payload:{columns:string[], rows:any[]} }
  | { type:'heartbeat' }
  | { type:'user', payload:string }

export default function ChatStream(){
  const [frames,setFrames]=useState<Frame[]>([])
  const [input,setInput]=useState('')
  const wsRef = useRef<WebSocket|null>(null)
  const params = useSearchParams()
  const fileId = params.get('file_id') || undefined

  useEffect(()=>{
    const ws = new WebSocket(WS)
    ws.onmessage = (ev)=>{
      const msg = JSON.parse(ev.data)
      if(msg.type==='heartbeat') return
      setFrames(f=>[...f,msg])
    }
    wsRef.current = ws
    return ()=>ws.close()
  },[])

  const send = ()=>{
    wsRef.current?.send(JSON.stringify({ user_id:'demo', conversation_id:'conv-1', query: input, file_id: fileId }))
    setFrames(f=>[...f, {type:'user', payload:input} as any])
    setInput('')
  }

  const lastResult = useMemo(()=>frames.find(f=>f.type==='result') as any,[frames])

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* LEFT: context */}
      <div className="col-span-1 border rounded p-3 h-[70vh] overflow-auto">
        <h3 className="font-semibold mb-2">Retrieved chunks</h3>
        {lastResult?.payload?.objects?.map((c:Chunk,i:number)=>(
          <div key={i} className="mb-3 border rounded p-2">
            <div className="text-xs text-gray-500">file:{c.meta.file_id} · p.{c.meta.page} · {c.meta.section}</div>
            <div className="text-sm">{c.text}</div>
          </div>
        ))}
      </div>

      {/* RIGHT: chat */}
      <div className="col-span-2">
        <div className="h-[60vh] overflow-auto border rounded p-3 space-y-3">
          {frames.map((m,i)=>(
            <div key={i} className={m.type==='user'?'text-right':''}>
              {m.type==='viz'
                ? <PlotCard spec={m.payload}/>
                : m.type==='table'
                  ? <TableCard table={m.payload}/>
                  : <div className={`inline-block px-3 py-2 rounded ${m.type==='user'?'bg-blue-100':'bg-gray-100'}`}>
                      <pre className="whitespace-pre-wrap text-sm">
                        {typeof (m as any).payload==='string'
                          ? (m as any).payload
                          : JSON.stringify((m as any).payload,null,2)
                        }
                      </pre>
                    </div>
              }
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="border p-2 rounded flex-1" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your data… e.g., 'plot oil rate by month 2024'" />
          <button onClick={send} className="px-4 py-2 bg-black text-white rounded">Send</button>
        </div>
      </div>
    </div>
  )
}
