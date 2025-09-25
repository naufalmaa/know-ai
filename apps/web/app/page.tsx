'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import LandingPage from './landing/page'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch(api('/api/auth/me'), {
        credentials: 'include'
      })
      if (response.ok) {
        // User is authenticated, redirect to drive
        router.push('/drive')
      } else {
        // User is not authenticated, show landing page
        setIsAuthenticated(false)
      }
    } catch (error) {
      // Error checking auth, show landing page
      setIsAuthenticated(false)
    }
  }

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page for non-authenticated users
  return <LandingPage />
}
