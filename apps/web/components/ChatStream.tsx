'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PlotCard from './PlotCard'
import TableCard from './TableCard'

const WS = process.env.NEXT_PUBLIC_CHAT_WS || 'ws://127.0.0.1:8000/ws'

console.log('WebSocket URL:', WS)
console.log('Environment check:', {
  NEXT_PUBLIC_CHAT_WS: process.env.NEXT_PUBLIC_CHAT_WS,
  NODE_ENV: process.env.NODE_ENV
})

type Chunk = { text:string, meta:{ file_id:string, page:number, section:string } }
type Frame =
  | { type:'result', payload:{ objects: Chunk[] } }
  | { type:'answer', payload:string }
  | { type:'answer_enhanced', payload:string }
  | { type:'viz', payload:any }
  | { type:'table', payload:{columns:string[], rows:any[]} }
  | { type:'heartbeat' }
  | { type:'user', payload:string }
  | { type:'agno_status', payload:string, stage:string }
  | { type:'agno_enhancement', payload:{ original:string, enhanced:string, confidence:number, reasoning:string } }
  | { type:'agno_evaluation', payload:{ improvements_made:boolean, confidence:number, reasoning:string, suggestions:string[] } }

export default function ChatStream(){
  const [frames,setFrames]=useState<Frame[]>([])
  const [input,setInput]=useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const wsRef = useRef<WebSocket|null>(null)
  const params = useSearchParams()
  const fileId = params.get('file_id') || undefined

  // Enhanced message rendering function for Agno message types
  const renderMessage = (frame: Frame, index: number) => {
    switch (frame.type) {
      case 'agno_enhancement':
        const enhancement = frame.payload as { original: string, enhanced: string, confidence: number, reasoning: string }
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="text-sm font-semibold text-blue-800 mb-2">🔧 Prompt Enhancement</div>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-600">Original:</span>
                <div className="text-sm bg-gray-100 p-2 rounded">{enhancement.original}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Enhanced:</span>
                <div className="text-sm bg-blue-100 p-2 rounded">{enhancement.enhanced}</div>
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-medium">Confidence:</span> {(enhancement.confidence * 100).toFixed(1)}% | 
                <span className="font-medium"> Reasoning:</span> {enhancement.reasoning}
              </div>
            </div>
          </div>
        )

      case 'agno_evaluation':
        const evaluation = frame.payload as { improvements_made: boolean, confidence: number, reasoning: string, suggestions: string[] }
        return (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="text-sm font-semibold text-green-800 mb-2">✅ Response Evaluation</div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Status:</span> {evaluation.improvements_made ? 'Enhanced' : 'Original maintained'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Confidence:</span> {(evaluation.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm">
                <span className="font-medium">Reasoning:</span> {evaluation.reasoning}
              </div>
              {evaluation.suggestions.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Suggestions:</span>
                  <ul className="list-disc list-inside ml-2 text-xs">
                    {evaluation.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )

      case 'answer_enhanced':
        return (
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <div className="text-sm font-semibold text-purple-800 mb-2">🚀 Enhanced Answer</div>
            <div className="text-sm whitespace-pre-wrap">{frame.payload}</div>
          </div>
        )

      case 'viz':
        return <PlotCard spec={frame.payload}/>

      case 'table':
        return <TableCard table={frame.payload}/>

      default:
        return (
          <div className={`inline-block px-3 py-2 rounded ${frame.type==='user'?'bg-blue-100':'bg-gray-100'}`}>
            <pre className="whitespace-pre-wrap text-sm">
              {typeof (frame as any).payload==='string'
                ? (frame as any).payload
                : JSON.stringify((frame as any).payload,null,2)
              }
            </pre>
          </div>
        )
    }
  }

  useEffect(()=>{    
    console.log('Attempting WebSocket connection to:', WS)
    const ws = new WebSocket(WS)
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully')
      setWsConnected(true)
    }
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      setWsConnected(false)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      console.error('Failed to connect to:', WS)
      setWsConnected(false)
    }
    
    ws.onmessage = (ev)=>{      
      const msg = JSON.parse(ev.data)
      if(msg.type==='heartbeat') return
      
      // Handle Agno status updates
      if(msg.type === 'agno_status') {
        setProcessingStage(msg.payload)
        return
      }
      
      setFrames(f=>[...f,msg])
    }
    
    wsRef.current = ws
    return ()=>{
      ws.close()
      setWsConnected(false)
    }
  },[])

  const send = ()=>{
    if (!wsConnected || !wsRef.current) {
      console.warn('WebSocket not connected')
      return
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, current state:', wsRef.current.readyState)
      return
    }
    
    wsRef.current.send(JSON.stringify({ user_id:'demo', conversation_id:'conv-1', query: input, file_id: fileId }))
    setFrames(f=>[...f, {type:'user', payload:input} as any])
    setInput('')
  }

  const lastResult = useMemo(() => {
    for (let i = frames.length - 1; i >= 0; i -= 1) {
      if (frames[i].type === 'result') {
        return frames[i] as Extract<Frame, { type: 'result' }>
      }
    }
    return undefined
  }, [frames])

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
        {/* Processing Stage Indicator */}
        {processingStage && (
          <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded p-2">
            <div className="text-sm text-yellow-800">
              <span className="animate-spin">⏳</span> {processingStage}
            </div>
          </div>
        )}
        
        <div className="h-[60vh] overflow-auto border rounded p-3 space-y-3">
          {frames.map((m,i)=>(
            <div key={i} className={m.type==='user'?'text-right':''}>
              {renderMessage(m, i)}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input 
            className="border p-2 rounded flex-1" 
            value={input} 
            onChange={e=>setInput(e.target.value)} 
            placeholder="Ask about your data… e.g., 'plot oil rate by month 2024'" 
            onKeyPress={e => e.key === 'Enter' && send()}
          />
          <button 
            onClick={send} 
            disabled={!wsConnected || !input.trim()}
            className={`px-4 py-2 rounded ${
              wsConnected && input.trim() 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {wsConnected ? 'Send' : 'Connecting...'}
          </button>
        </div>
      </div>
    </div>
  )
}
