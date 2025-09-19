'use client'
import useSWR from 'swr'
import { api, fetcher } from '@/lib/api'

export default function Dashboard(){
  const { data } = useSWR(api('/api/files'), fetcher)
  const totals = (data||[]).reduce((a:any,r:any)=>{
    a.count++; const t=r.doc_type||'Unknown'; a.byType[t]=(a.byType[t]||0)+1; return a
  },{count:0, byType:{}})
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Metadata Dashboard</h1>
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">File</th>
            <th className="text-left">Size</th>
            <th className="text-left">Basin</th>
            <th className="text-left">Block</th>
            <th className="text-left">Well</th>
            <th className="text-left">Indexed</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((r: any) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.filename}</td>
              <td>{r.size}</td>
              <td>{r.basin || '-'}</td>
              <td>{r.block || '-'}</td>
              <td>{r.well_name || '-'}</td>
              <td>{r.indexed ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
