'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { DriveFolder, DriveFile, driveApi, api } from '@/lib/api'

// Helper function to get file type icon
const getFileTypeIcon = (filename: string, mimeType?: string) => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mime = mimeType?.toLowerCase() || ''
  
  // PDF files
  if (ext === 'pdf' || mime.includes('pdf')) {
    return (
      <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H8V4H20V16Z" />
        <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6Z" />
      </svg>
    )
  }
  
  // Excel files
  if (['xlsx', 'xls', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('csv')) {
    return (
      <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z" />
      </svg>
    )
  }
  
  // Word documents
  if (['doc', 'docx'].includes(ext) || mime.includes('document')) {
    return (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4Z" />
      </svg>
    )
  }
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || mime.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
      </svg>
    )
  }
  
  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext) || mime.startsWith('video/')) {
    return (
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z" />
      </svg>
    )
  }
  
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || mime.startsWith('audio/')) {
    return (
      <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
      </svg>
    )
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return (
      <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,17H12V15H14M14,13H12V11H14M12,9H14V7H12M12,19H14V17H12M10,7V9H12V7M14,9V11H16V9M10,15H12V13H10M8,11V13H10V11M16,13V15H14V13M8,15V17H10V15M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z" />
      </svg>
    )
  }
  
  // Text files
  if (['txt', 'md', 'rtf'].includes(ext) || mime.startsWith('text/')) {
    return (
      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z" />
      </svg>
    )
  }
  
  // Default file icon
  return (
    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4Z" />
    </svg>
  )
}

// Helper function to check if file is Excel
const isExcelFile = (filename: string, mimeType?: string) => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mime = mimeType?.toLowerCase() || ''
  return ['xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet')
}

interface FileGridProps {
  folders: DriveFolder[];
  files: DriveFile[];
  loading?: boolean;
  onFolderCreated?: (folder: DriveFolder) => void;
  onItemDeleted?: (type: 'folder' | 'file', id: string) => void;
  onItemRenamed?: (type: 'folder' | 'file', id: string, newName: string) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
  sortBy?: 'name' | 'date';
  sortOrder?: 'asc' | 'desc';
}

interface GridItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  created_at: string;
  mime_type?: string;
  isOptimistic?: boolean;
  isCreating?: boolean;
  doc_type?: string;
  basin?: string;
  block?: string;
}

interface TempFolder extends DriveFolder {
  isOptimistic: boolean;
  isCreating: boolean;
}

export default function FileGrid({ 
  folders, 
  files, 
  loading, 
  onFolderCreated, 
  onItemDeleted, 
  onItemRenamed, 
  onError, 
  onSuccess,
  sortBy = 'name',
  sortOrder = 'asc'
}: FileGridProps) {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Add missing state variables
  const [renamingItem, setRenamingItem] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; type: 'folder' | 'file' } | null>(null)
  const [tempFolders, setTempFolders] = useState<TempFolder[]>([])
  const [fileInfoModal, setFileInfoModal] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<any>(null)
  // Add state for Excel editing
  const [excelEditModal, setExcelEditModal] = useState<{ id: string; name: string; data: any[] } | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const [fileViewModal, setFileViewModal] = useState<{ id: string; name: string; type: string; url?: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Create combined and sorted items
  const allItems: GridItem[] = [
    ...tempFolders.map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      created_at: f.created_at,
      isOptimistic: f.isOptimistic,
      isCreating: f.isCreating
    })),
    ...folders.map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      created_at: f.created_at
    })),
    ...files.map(f => ({
      id: f.id,
      name: f.filename,
      type: 'file' as const,
      size: f.size,
      created_at: f.created_at,
      mime_type: f.mime_type,
      doc_type: f.doc_type,
      basin: f.basin,
      block: f.block
    }))
  ]

  // Sort items
  const sortedItems = allItems.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    
    let comparison = 0
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Handle optimistic folder creation
  const addOptimisticFolder = (name: string) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempFolder: TempFolder = {
      id: tempId,
      name,
      parent_id: null,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      isCreating: true
    }
    setTempFolders(prev => [...prev, tempFolder])
    return tempId
  }

  const resolveOptimisticFolder = (tempId: string, realFolder?: DriveFolder) => {
    setTempFolders(prev => prev.filter(f => f.id !== tempId))
    if (realFolder && onFolderCreated) {
      onFolderCreated(realFolder)
    }
  }

  // Expose optimistic folder creation to parent
  useEffect(() => {
    const handleOptimisticCreate = (event: CustomEvent) => {
      const { name, parentId } = event.detail
      const tempId = addOptimisticFolder(name)
      
      driveApi.createFolder(name, parentId)
        .then(folder => {
          resolveOptimisticFolder(tempId, folder)
          onSuccess?.('Folder created successfully')
        })
        .catch(error => {
          resolveOptimisticFolder(tempId)
          onError?.(error.message || 'Failed to create folder')
        })
    }

    document.addEventListener('create-optimistic-folder', handleOptimisticCreate as EventListener)
    return () => document.removeEventListener('create-optimistic-folder', handleOptimisticCreate as EventListener)
  }, [onFolderCreated, onError, onSuccess])

  // Handle clicks and keyboard events
  const handleItemClick = (item: GridItem, event: React.MouseEvent) => {
    if (event.detail === 2) { // Double click
      if (item.type === 'folder' && !item.isOptimistic) {
        router.push(`/drive?folder=${item.id}`)
      }
      return
    }

    // Single click - selection
    if (event.ctrlKey || event.metaKey) {
      setSelectedItems(prev => {
        const newSet = new Set(prev)
        if (newSet.has(item.id)) {
          newSet.delete(item.id)
        } else {
          newSet.add(item.id)
        }
        return newSet
      })
    } else {
      setSelectedItems(new Set([item.id]))
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (selectedItems.size === 0) return

    if (event.key === 'Delete') {
      handleDelete()
    } else if (event.key === 'F2') {
      handleRename()
    } else if (event.key === 'Enter') {
      const firstSelected = Array.from(selectedItems)[0]
      const item = allItems.find(i => i.id === firstSelected)
      if (item?.type === 'folder' && !item.isOptimistic) {
        router.push(`/drive?folder=${item.id}`)
      }
    }
  }

  const handleContextMenu = (event: React.MouseEvent, item: GridItem) => {
    if (item.isOptimistic) return
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      itemId: item.id,
      type: item.type
    })
  }

  const handleRename = () => {
    if (selectedItems.size !== 1) return
    const itemId = Array.from(selectedItems)[0]
    const item = allItems.find(i => i.id === itemId)
    if (!item || item.isOptimistic) return
    
    setRenamingItem(itemId)
    setRenameValue(item.name)
    setContextMenu(null)
  }

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renameValue.trim()) return
    
    const item = allItems.find(i => i.id === renamingItem)
    if (!item) return

    try {
      if (item.type === 'folder') {
        await driveApi.renameFolder(renamingItem, renameValue.trim())
      } else {
        await driveApi.renameFile(renamingItem, renameValue.trim())
      }
      onItemRenamed?.(item.type, renamingItem, renameValue.trim())
      onSuccess?.(`${item.type === 'folder' ? 'Folder' : 'File'} renamed successfully`)
    } catch (error: any) {
      onError?.(error.message || 'Failed to rename item')
    }
    
    setRenamingItem(null)
    setRenameValue('')
  }

  const handleShowFileInfo = async (fileId: string) => {
    try {
      const response = await fetch(api(`/api/files/${fileId}/status`))
      if (response.ok) {
        const info = await response.json()
        setFileInfo(info)
        setFileInfoModal(fileId)
        
        // If file is still processing, start polling for updates
        if (info.processing_status === 'processing') {
          startPollingFileStatus(fileId)
        }
      } else {
        onError?.('Failed to load file information')
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to load file information')
    }
  }

  const refreshFileInfo = async (fileId: string) => {
    try {
      const response = await fetch(api(`/api/files/${fileId}/status`))
      if (response.ok) {
        const info = await response.json()
        setFileInfo(info)
        
        // If processing completed, stop polling
        if (info.processing_status === 'completed' || info.processing_status === 'error') {
          stopPollingFileStatus()
        }
      }
    } catch (error: any) {
      console.error('Failed to refresh file info:', error)
    }
  }

  // Polling mechanism for file status updates
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  
  const startPollingFileStatus = (fileId: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    // Poll every 3 seconds
    const interval = setInterval(() => {
      refreshFileInfo(fileId)
    }, 3000)
    
    setPollingInterval(interval)
  }
  
  const stopPollingFileStatus = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }
  
  // Clean up polling on component unmount or modal close
  useEffect(() => {
    if (!fileInfoModal) {
      stopPollingFileStatus()
    }
    
    return () => {
      stopPollingFileStatus()
    }
  }, [fileInfoModal])

  const handleViewFile = async (fileId: string, fileName: string, mimeType?: string) => {
    const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')
    const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)
    
    try {
      // Get the signed URL from the API
      const response = await fetch(api(`/api/files/${fileId}/signed-get`))
      if (!response.ok) {
        throw new Error('Failed to get file URL')
      }
      const { url } = await response.json()
      
      if (isPdf || isImage) {
        // Show preview modal for PDF and images with the actual URL
        setFileViewModal({ id: fileId, name: fileName, type: isPdf ? 'pdf' : 'image', url })
      } else {
        // For other file types, open in new tab instead of downloading
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Error getting file URL:', error)
      onError?.('Failed to open file')
    }
  }

  const handleEditExcel = async (fileId: string, fileName: string) => {
    try {
      // Get the Excel data from the API
      const response = await fetch(api(`/api/files/${fileId}/excel-data`))
      if (!response.ok) {
        throw new Error('Failed to load Excel data')
      }
      const { data } = await response.json()
      
      setExcelEditModal({ id: fileId, name: fileName, data })
    } catch (error) {
      console.error('Error loading Excel file:', error)
      onError?.('Failed to load Excel file for editing')
    }
  }

  const updateCellValue = (rowIndex: number, column: string, value: string) => {
    if (!excelEditModal) return
    
    const newData = [...excelEditModal.data]
    newData[rowIndex] = { ...newData[rowIndex], [column]: value }
    
    setExcelEditModal({ ...excelEditModal, data: newData })
  }

  const addNewRow = () => {
    if (!excelEditModal) return
    
    const newRow = { A: '', B: '', C: '', D: '' }
    const newData = [...excelEditModal.data, newRow]
    
    setExcelEditModal({ ...excelEditModal, data: newData })
  }

  const deleteRow = (rowIndex: number) => {
    if (!excelEditModal || rowIndex === 0) return // Don't delete header row
    
    const newData = excelEditModal.data.filter((_, index) => index !== rowIndex)
    setExcelEditModal({ ...excelEditModal, data: newData })
  }

  const saveExcelChanges = async () => {
    if (!excelEditModal) return
    
    try {
      const response = await fetch(api(`/api/files/${excelEditModal.id}/excel-data`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: excelEditModal.data })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save Excel changes')
      }
      
      const result = await response.json()
      onSuccess?.(result.message || 'Excel file updated successfully')
      setExcelEditModal(null)
    } catch (error) {
      console.error('Error saving Excel changes:', error)
      onError?.('Failed to save Excel changes')
    }
  }

  const handleDelete = async () => {
    if (selectedItems.size === 0) return
    
    const itemsToDelete = Array.from(selectedItems)
      .map(id => allItems.find(i => i.id === id))
      .filter((item): item is GridItem => !!item && !item.isOptimistic)
    
    if (itemsToDelete.length === 0) return

    const confirmed = confirm(
      `Are you sure you want to delete ${itemsToDelete.length} item(s)? This action cannot be undone.`
    )
    
    if (!confirmed) return

    for (const item of itemsToDelete) {
      try {
        if (item.type === 'folder') {
          await driveApi.deleteFolder(item.id)
        } else {
          await driveApi.deleteFile(item.id)
        }
        onItemDeleted?.(item.type, item.id)
      } catch (error: any) {
        onError?.(error.message || `Failed to delete ${item.name}`)
      }
    }
    
    setSelectedItems(new Set())
    setContextMenu(null)
  }

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingItem && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingItem])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sortedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">This folder is empty</h3>
          <p className="text-gray-500 mb-4">Create your first folder or upload some files to get started</p>
          <button 
            onClick={() => document.dispatchEvent(new Event('open-new-folder-modal'))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="p-6 flex-1 focus:outline-none" 
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedItems.map(item => {
          const isSelected = selectedItems.has(item.id)
          const isRenaming = renamingItem === item.id
          
          return (
            <div
              key={item.id}
              className={`
                group relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${item.isOptimistic ? 'opacity-70' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
              onClick={(e) => handleItemClick(item, e)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              tabIndex={0}
            >
              {/* Icon */}
              <div className="flex items-center justify-center h-12 mb-3">
                {item.type === 'folder' ? (
                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                  </svg>
                ) : (
                  getFileTypeIcon(item.name, item.mime_type)
                )}
                {item.isCreating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              {/* Name */}
              <div className="text-center">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit()
                      if (e.key === 'Escape') {
                        setRenamingItem(null)
                        setRenameValue('')
                      }
                    }}
                    className="w-full text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 text-center"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.type === 'folder' 
                        ? 'Folder' 
                        : `${item.mime_type?.split('/')[1] || 'file'} • ${formatFileSize(item.size)}`
                      }
                    </div>
                    {item.doc_type && (
                      <div className="text-xs text-blue-600 mt-1">
                        {item.doc_type}
                      </div>
                    )}
                    {item.type === 'file' && (
                      <div className="flex justify-center mt-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewFile(item.id, item.name, item.mime_type)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                          title="View file"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                          </svg>
                          View
                        </button>
                        {isExcelFile(item.name, item.mime_type) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditExcel(item.id, item.name)
                            }}
                            className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50 flex items-center gap-1"
                            title="Edit Excel"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                            </svg>
                            Edit
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShowFileInfo(item.id)
                          }}
                          className="text-gray-600 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
                          title="File information"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
                          </svg>
                          Info
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Rename
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* File Info Modal */}
      {fileInfoModal && fileInfo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setFileInfoModal(null)}>
          <div 
            className="bg-white p-6 rounded-lg w-[500px] shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">File Information</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshFileInfo(fileInfoModal)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Refresh status"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H8a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H12a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setFileInfoModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{fileInfo.filename}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Size</label>
                <p className="mt-1 text-sm text-gray-900">{formatFileSize(fileInfo.size)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Processing Status</label>
                <p className="mt-1 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    fileInfo.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                    fileInfo.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    fileInfo.processing_status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {fileInfo.processing_status === 'completed' ? (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Processing Complete
                      </>
                    ) : fileInfo.processing_status === 'processing' ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H8a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H12a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Processing...
                      </>
                    ) : fileInfo.processing_status === 'error' ? (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Processing Failed
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Pending Processing
                      </>
                    )}
                  </span>
                </p>
                {fileInfo.processing_status === 'completed' && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    File has been successfully processed and chunked into the database
                  </p>
                )}
                {fileInfo.processing_status === 'processing' && (
                  <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H8a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H12a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Processing in progress... Status will update automatically
                  </p>
                )}
              </div>
              
              {fileInfo.chunks_count !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Chunks</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    {fileInfo.chunks_count} chunks processed
                    {fileInfo.processing_status === 'completed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Ready
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {fileInfo.doc_type && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Document Type</label>
                  <p className="mt-1 text-sm text-gray-900">{fileInfo.doc_type}</p>
                </div>
              )}
              
              {(fileInfo.basin || fileInfo.block) && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Metadata</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {fileInfo.basin && <p>Basin: {fileInfo.basin}</p>}
                    {fileInfo.block && <p>Block: {fileInfo.block}</p>}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Uploaded</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(fileInfo.created_at).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Indexed</label>
                <p className="mt-1 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    fileInfo.indexed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {fileInfo.indexed ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFileInfoModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setFileInfoModal(null)
                  handleViewFile(fileInfo.id, fileInfo.filename, fileInfo.mime_type)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                View File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File View Modal */}
      {fileViewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setFileViewModal(null)}>
          <div 
            className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg truncate">{fileViewModal.name}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={fileViewModal.url}
                  target="_blank"
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Open in New Tab
                </a>
                <button
                  onClick={() => setFileViewModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-hidden">
              {fileViewModal.type === 'pdf' ? (
                <iframe
                  src={fileViewModal.url}
                  className="w-full h-full border-0 rounded"
                  title={fileViewModal.name}
                />
              ) : fileViewModal.type === 'image' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={fileViewModal.url}
                    alt={fileViewModal.name}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Excel Edit Modal */}
      {excelEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExcelEditModal(null)}>
          <div 
            className="bg-white rounded-lg w-[95vw] h-[90vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Edit Excel: {excelEditModal.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={addNewRow}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                  </svg>
                  Add Row
                </button>
                <button
                  onClick={saveExcelChanges}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
                  </svg>
                  Save
                </button>
                <button
                  onClick={() => setExcelEditModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-auto">
              <div className="border border-gray-300 rounded">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 p-2 border-r border-gray-300 text-xs">#</th>
                      <th className="p-2 border-r border-gray-300 text-sm font-medium">A</th>
                      <th className="p-2 border-r border-gray-300 text-sm font-medium">B</th>
                      <th className="p-2 border-r border-gray-300 text-sm font-medium">C</th>
                      <th className="p-2 border-r border-gray-300 text-sm font-medium">D</th>
                      <th className="w-16 p-2 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelEditModal.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="p-2 border-r border-b border-gray-300 text-xs text-gray-500 bg-gray-50">
                          {rowIndex + 1}
                        </td>
                        {['A', 'B', 'C', 'D'].map((col) => (
                          <td key={col} className="p-1 border-r border-b border-gray-300">
                            {editingCell?.row === rowIndex && editingCell?.col === col ? (
                              <input
                                type="text"
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onBlur={() => {
                                  updateCellValue(rowIndex, col, cellValue)
                                  setEditingCell(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCellValue(rowIndex, col, cellValue)
                                    setEditingCell(null)
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null)
                                    setCellValue('')
                                  }
                                }}
                                className="w-full p-1 border-0 outline-none focus:bg-blue-50"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="p-1 min-h-[24px] cursor-pointer hover:bg-blue-50"
                                onClick={() => {
                                  setEditingCell({ row: rowIndex, col })
                                  setCellValue(row[col] || '')
                                }}
                              >
                                {row[col] || ''}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="p-2 border-b border-gray-300">
                          {rowIndex > 0 && ( // Don't show delete for header row
                            <button
                              onClick={() => deleteRow(rowIndex)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete row"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click on any cell to edit its value</li>
                  <li>Press Enter to save changes or Escape to cancel</li>
                  <li>Use the "Add Row" button to add new rows</li>
                  <li>Click the delete icon to remove rows (except the header)</li>
                  <li>Click "Save" to apply changes (demo mode)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}
