'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Sidebar from '@/components/drive/Sidebar'
import Toolbar from '@/components/drive/Toolbar'
import Breadcrumbs from '@/components/drive/Breadcrumbs'
import FileGrid from '@/components/drive/FileGrid'
import Uploader from '@/components/Uploader'
import NewFolderModal from '@/components/drive/NewFolderModal'
import { useSearchParams } from 'next/navigation'
import { api, fetcher } from '@/lib/api'

export default function DrivePage(){
  const params = useSearchParams()
  const folderId = params.get('folder') || undefined
  const { data, mutate } = useSWR(api(`/api/drive/children${folderId?`?folder_id=${folderId}`:''}`), fetcher)
  const [searchRes,setSearchRes]=useState<any[]|null>(null)

  const onSearch = async (q:string)=>{
    if(!q.trim()){ setSearchRes(null); return }
    const res = await fetch(api(`/api/drive/search?q=${encodeURIComponent(q)}`)).then(r=>r.json())
    setSearchRes(res)
  }

  const body = useMemo(()=>(
    searchRes
      ? <div className="p-3">
          <h3 className="font-semibold mb-2">Search results</h3>
          <FileGrid folders={[]} files={searchRes}/>
        </div>
      : <div>
          <div className="p-3">
            <Breadcrumbs folderId={folderId}/>
            <div className="mt-3"><Uploader folderId={folderId} /></div>
          </div>
          <FileGrid folders={data?.folders||[]} files={data?.files||[]} />
        </div>
  ),[data,searchRes,folderId])

  return (
    <div className="flex">
      <Sidebar/>
      <div className="flex-1">
        <Toolbar onSearch={onSearch}/>
        {body}
      </div>
      <NewFolderModal folderId={folderId} onCreated={()=>mutate()}/>
    </div>
  )
}
