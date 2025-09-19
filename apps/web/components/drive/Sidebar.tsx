'use client'
import Link from 'next/link'
export default function Sidebar(){
  return (
    <aside className="w-56 border-r h-[calc(100vh-64px)] sticky top-16 p-3">
      <button
        onClick={()=>document.dispatchEvent(new CustomEvent('open-new-folder-modal'))}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded">
        + New folder
      </button>
      <nav className="space-y-2 text-sm">
        <Link href="/drive" className="block px-2 py-1 rounded hover:bg-gray-100">My Drive</Link>
        <a className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Shared (soon)</a>
        <a className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Recent (soon)</a>
        <Link href="/sections" className="block px-2 py-1 rounded hover:bg-gray-100">Sectional Dashboard</Link>
      </nav>
    </aside>
  )
}
