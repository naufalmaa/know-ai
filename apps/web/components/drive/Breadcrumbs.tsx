'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { api, fetcher } from '@/lib/api'

export default function Breadcrumbs({ folderId }:{ folderId?:string }){
  const { data } = useSWR(folderId ? api(`/api/drive/breadcrumbs/${folderId}`) : null, fetcher)
  if(!folderId) return <div className="text-sm text-gray-500">My Drive</div>
  return (
    <div className="text-sm">
      <Link className="text-gray-500 hover:underline" href="/drive">My Drive</Link>
      {data?.map((n:any)=>(
        <span key={n.id}> / <Link href={`/drive?folder=${n.id}`} className="hover:underline">{n.name}</Link></span>
      ))}
    </div>
  )
}
