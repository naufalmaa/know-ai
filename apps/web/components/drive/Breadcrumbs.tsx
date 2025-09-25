'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { driveApi } from '@/lib/api'

interface BreadcrumbsProps {
  folderId?: string;
}

export default function Breadcrumbs({ folderId }: BreadcrumbsProps) {
  const { data: breadcrumbs, isLoading } = useSWR(
    folderId ? `breadcrumbs-${folderId}` : null,
    () => folderId ? driveApi.getBreadcrumbs(folderId) : null
  )

  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <span>/</span>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  if (!folderId) {
    return (
      <div className="flex items-center text-sm">
        <span className="text-gray-900 font-medium">📁 My Drive</span>
      </div>
    )
  }

  return (
    <nav className="flex items-center text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link 
            href="/drive" 
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            📁 My Drive
          </Link>
        </li>
        
        {breadcrumbs?.map((folder, index) => (
          <li key={folder.id} className="flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            <Link 
              href={`/drive?folder=${folder.id}`}
              className="text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
              title={folder.name}
            >
              {folder.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
