'use client'
import { useRouter } from 'next/navigation'

export default function FileGrid({ folders, files }:{ folders:any[], files:any[] }){
  const r = useRouter()
  return (
    <div className="grid grid-cols-4 gap-3 p-3">
      {folders.map(f=>(
        <div key={f.id} className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
             onDoubleClick={()=>r.push(`/drive?folder=${f.id}`)}>
          <div className="font-medium">📁 {f.name}</div>
          <div className="text-xs text-gray-500">Folder</div>
        </div>
      ))}
      {files.map(f=>(
        <div key={f.id} className="border rounded p-3 hover:bg-gray-50">
          <div className="font-medium truncate">📄 {f.filename}</div>
          <div className="text-xs text-gray-500">{f.mime_type||'file'} · {(f.size||0)}B</div>
          <div className="mt-2 flex gap-2 text-sm">
            <a className="underline" href={`/api/files/${f.id}/signed-get`} target="_blank">Preview</a>
            <a className="underline" href={`/assistant?file_id=${f.id}`}>Ask</a>
          </div>
        </div>
      ))}
    </div>
  )
}
