'use client'
import { useState } from 'react'
export default function Toolbar({ onSearch }:{ onSearch:(q:string)=>void }){
  const [q,setQ]=useState('')
  return (
    <div className="h-12 flex items-center gap-3 px-3 border-b">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search in Drive"
             className="flex-1 border rounded px-3 py-1"/>
      <button onClick={()=>onSearch(q)} className="px-3 py-1 rounded border">Search</button>
    </div>
  )
}
