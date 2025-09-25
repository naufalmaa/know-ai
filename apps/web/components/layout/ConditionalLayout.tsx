// CHANGED: This file is updated for a more robust layout structure.
// It now correctly handles the viewport height and makes the main content area scrollable,
// preventing layout issues with the sticky navbar and sidebar.
// It also passes the `user` object to the Sidebar for role-based navigation.
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/drive/Sidebar'
import { api } from '@/lib/api'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  
  const noSidebarRoutes = ['/', '/login', '/landing']
  const shouldShowSidebar = isAuthenticated && !noSidebarRoutes.includes(pathname)

  useEffect(() => {
    checkAuth()
  }, [pathname]) // Re-check auth on route change if needed

  const checkAuth = async () => {
    try {
      const response = await fetch(api('/api/auth/me'), { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} isAuthenticated={isAuthenticated} onAuthChange={checkAuth} />
      
      <div className="flex flex-1 overflow-hidden">
        {shouldShowSidebar && <Sidebar user={user} />}
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}