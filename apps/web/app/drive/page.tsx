'use client'
import { useMemo, useState, useCallback } from 'react'
import useSWR from 'swr'
import axios from 'axios'
import Toolbar from '@/components/drive/Toolbar'
import Breadcrumbs from '@/components/drive/Breadcrumbs'
import FileGrid from '@/components/drive/FileGrid'
import Uploader from '@/components/Uploader'
import NewFolderModal from '@/components/drive/NewFolderModal'
import { useSearchParams } from 'next/navigation'
import { driveApi, api, DriveFolder, DriveFile } from '@/lib/api'

export default function DrivePage() {
  const params = useSearchParams()
  const folderId = params.get('folder') || undefined
  
  // State management
  const [searchResults, setSearchResults] = useState<DriveFile[] | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Data fetching
  const { data, mutate, isLoading } = useSWR(
    folderId ? `children-${folderId}` : 'children-root',
    () => driveApi.getChildren(folderId)
  )

  // Toast notifications
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    
    try {
      const results = await driveApi.search(query)
      setSearchResults(results)
    } catch (error: any) {
      showToast(error.message || 'Search failed', 'error')
    }
  }

  // Folder operations
  const handleFolderCreated = useCallback((folder: DriveFolder) => {
    mutate() // Refresh the folder contents
    showToast('Folder created successfully', 'success')
  }, [mutate])

  const handleItemDeleted = useCallback((type: 'folder' | 'file', id: string) => {
    mutate() // Refresh the folder contents
    showToast(`${type === 'folder' ? 'Folder' : 'File'} deleted successfully`, 'success')
  }, [mutate])

  const handleItemRenamed = useCallback((type: 'folder' | 'file', id: string, newName: string) => {
    mutate() // Refresh the folder contents
  }, [mutate])

  // Error handling
  const handleError = useCallback((error: string) => {
    showToast(error, 'error')
  }, [])

  const handleSuccess = useCallback((message: string) => {
    showToast(message, 'success')
  }, [])

  // Upload handling
  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      try {
        // Show uploading toast
        showToast(`Uploading ${file.name}...`, 'success')
        
        // Get presigned URL
        const presignResponse = await fetch(api('/api/uploads/presign'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name, 
            mime_type: file.type, 
            folder_id: folderId
          })
        })
        
        if (!presignResponse.ok) {
          throw new Error('Failed to get upload URL')
        }
        
        const { presign, file: fileRecord } = await presignResponse.json()

        // Upload to S3/MinIO
        const form = new FormData()
        Object.entries(presign.fields).forEach(([k, v]) => form.append(k, String(v)))
        form.append('file', file)
        
        const uploadResponse = await fetch(presign.url, { 
          method: 'POST', 
          body: form 
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file')
        }

        // Calculate checksum
        const buf = new Uint8Array(await file.arrayBuffer())
        const hash = await crypto.subtle.digest('SHA-256', buf)
        const checksum = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Complete upload
        const completeResponse = await fetch(api('/api/uploads/complete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            file_id: fileRecord.id, 
            size: file.size, 
            checksum 
          })
        })
        
        if (!completeResponse.ok) {
          throw new Error('Failed to complete upload')
        }

        showToast(`${file.name} uploaded successfully`, 'success')
      } catch (error: any) {
        console.error('Upload error:', error)
        showToast(`Failed to upload ${file.name}: ${error.message}`, 'error')
      }
    }
    
    // Refresh the folder contents
    mutate()
  }

  // Sort handling
  const handleSort = (by: 'name' | 'date', order: 'asc' | 'desc') => {
    setSortBy(by)
    setSortOrder(order)
  }

  // Render main content based on search state
  const mainContent = useMemo(() => {
    if (searchResults) {
      return (
        <div className="flex-1">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Search Results</h2>
              <p className="text-gray-600">{searchResults.length} files found</p>
              <button
                onClick={() => setSearchResults(null)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to folder
              </button>
            </div>
            <FileGrid 
              folders={[]} 
              files={searchResults}
              loading={false}
              onError={handleError}
              onSuccess={handleSuccess}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 flex flex-col">
        {/* Breadcrumbs and Upload */}
        <div className="p-6 pb-0">
          <Breadcrumbs folderId={folderId} />
        </div>
        
        {/* File Grid */}
        <FileGrid 
          folders={data?.folders || []} 
          files={data?.files || []}
          loading={isLoading}
          onFolderCreated={handleFolderCreated}
          onItemDeleted={handleItemDeleted}
          onItemRenamed={handleItemRenamed}
          onError={handleError}
          onSuccess={handleSuccess}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>
    )
  }, [data, searchResults, isLoading, folderId, sortBy, sortOrder, mutate, handleFolderCreated, handleItemDeleted, handleItemRenamed, handleError, handleSuccess])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Toolbar */}
      <Toolbar 
        onSearch={handleSearch}
        onUpload={handleUpload}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
      
      {/* Content */}
      {mainContent}
      
      {/* Modals */}
      <NewFolderModal 
        folderId={folderId} 
        onCreated={handleFolderCreated}
        onError={handleError}
      />
      
      {/* Toast Notifications */}
      {toast && (
        <div 
          className={`
            fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300
            ${toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <span>
              {toast.type === 'success' ? '✓' : '⚠️'}
            </span>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
