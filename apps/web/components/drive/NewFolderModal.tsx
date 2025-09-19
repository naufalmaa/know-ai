'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function NewFolderModal({ folderId, onCreated }:{ folderId?:string, onCreated:()=>void }){
  const [open,setOpen]=useState(false)
  const [name,setName]=useState('')
  useEffect(()=>{
    const h=()=>setOpen(true)
    document.addEventListener('open-new-folder-modal', h)
    return ()=>document.removeEventListener('open-new-folder-modal', h)
  },[])
  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-[360px]">
        <h3 className="font-bold mb-2">New folder</h3>
        <input className="border rounded w-full p-2" placeholder="Folder name" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="mt-3 flex justify-end gap-2">
          <button className="px-3 py-1" onClick={()=>setOpen(false)}>Cancel</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={async()=>{
            await fetch(api('/api/drive/folder'),{method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({ name, parent_id: folderId||null })})
            setOpen(false); setName(''); onCreated()
          }}>Create</button>
        </div>
      </div>
    </div>
  )
}
