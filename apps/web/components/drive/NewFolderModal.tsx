'use client'
import { useEffect, useState } from 'react'
import { driveApi } from '@/lib/api'

interface NewFolderModalProps {
  folderId?: string;
  onCreated: (folder: any) => void;
  onError?: (error: string) => void;
}

export default function NewFolderModal({ folderId, onCreated, onError }: NewFolderModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = () => setOpen(true)
    document.addEventListener('open-new-folder-modal', h)
    return () => document.removeEventListener('open-new-folder-modal', h)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setName('')
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    
    setLoading(true)
    try {
      const folder = await driveApi.createFolder(name.trim(), folderId)
      onCreated(folder)
      handleClose()
    } catch (error: any) {
      onError?.(error.message || 'Failed to create folder')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleCreate()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        className="bg-white p-6 rounded-lg w-[400px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-lg mb-4">New folder</h3>
        <input 
          className="border border-gray-300 rounded-md w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          placeholder="Folder name" 
          value={name} 
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoFocus
        />
        <div className="mt-6 flex justify-end gap-3">
          <button 
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
