'use client'
import { useState } from 'react'

interface ToolbarProps {
  onSearch: (q: string) => void;
  onNewFolder?: () => void;
  onUpload?: (files: FileList) => void;
  sortBy?: 'name' | 'date';
  sortOrder?: 'asc' | 'desc';
  onSort?: (by: 'name' | 'date', order: 'asc' | 'desc') => void;
}

export default function Toolbar({ 
  onSearch, 
  onNewFolder, 
  onUpload, 
  sortBy = 'name', 
  sortOrder = 'asc', 
  onSort 
}: ToolbarProps) {
  const [q, setQ] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(q)
    }
  }

  const toggleSort = () => {
    if (!onSort) return
    if (sortBy === 'name') {
      onSort('name', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort('name', 'asc')
    }
  }

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b bg-white">
      {/* New Folder Button */}
      <button 
        onClick={() => {
          onNewFolder?.()
          document.dispatchEvent(new Event('open-new-folder-modal'))
        }}
        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
        </svg>
        New Folder
      </button>

      {/* Upload Button */}
      <input
        type="file"
        multiple
        onChange={(e) => e.target.files && onUpload?.(e.target.files)}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
        Upload
      </label>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Sort Button */}
      <button 
        onClick={toggleSort}
        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.25,5L12.5,1.75L15.75,5H9.25M15.75,19L12.5,22.25L9.25,19H15.75M8.89,14.3H6L5.28,17H2.91L6,7H9L12.13,17H9.67L8.89,14.3M6.33,12.68H8.56L7.93,10.56L7.67,9.59L7.42,8.63H7.39L7.17,9.6L6.93,10.58L6.33,12.68M13.05,17V15.74L17.8,8.97V8.91H13.5V7H20.73V8.34L16.09,15V15.08H20.8V17H13.05Z" />
        </svg>
        Sort: {sortBy}
        <svg className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
        </svg>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md ml-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in Drive" 
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button 
            type="submit"
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
