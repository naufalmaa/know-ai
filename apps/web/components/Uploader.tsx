'use client'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function Uploader({ folderId }: { folderId?: string }) {
  const [log, setLog] = useState('')

  const onDrop = async (files: File[]) => {
    for (const f of files) {
      try {
        const url = api('/api/uploads/presign')
        // Debug URL supaya kalau 404 kelihatan larinya ke mana
        console.debug('presign URL =>', url)

        const { data: { presign, file } } = await axios.post(url, {
          filename: f.name, mime_type: f.type, folder_id: folderId
        })

        const form = new FormData()
        Object.entries(presign.fields).forEach(([k, v]) => form.append(k, String(v)))
        form.append('file', f)
        await fetch(presign.url, { method: 'POST', body: form })

        const buf = new Uint8Array(await f.arrayBuffer())
        const hash = await crypto.subtle.digest('SHA-256', buf)
        const checksum = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

        await axios.post(api('/api/uploads/complete'), { file_id: file.id, size: f.size, checksum })

        setLog(l => l + `uploaded ${f.name}\n`)
      } catch (err: any) {
        console.error('Upload error', err?.response?.status, err?.response?.data || err?.message)
        setLog(l => l + `ERROR uploading ${f.name}: ${err?.response?.status || ''} ${err?.message}\n`)
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })
  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded p-10 text-center ${isDragActive ? 'bg-gray-50' : ''}`}>
        <input {...getInputProps()} />
        <p>Drag & drop files here, or click to select</p>
      </div>
      <pre className="mt-4 text-sm bg-black text-white p-3 rounded h-48 overflow-auto">{log}</pre>
    </div>
  )
}
