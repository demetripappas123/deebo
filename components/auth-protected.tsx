'use client'

import { useAuth } from '@/context/authcontext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/modules/sidebar'

export default function AuthProtected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // If on login page, don't redirect
    if (isLoginPage) return

    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, isLoginPage])

  // Show loading state (but allow login page to render)
  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Allow login page to render without auth
  if (isLoginPage) {
    return <>{children}</>
  }

  // If not logged in and not on login page, don't render (redirect will happen)
  if (!user) {
    return null
  }

  // Render protected content with sidebar
  return (
    <div className="flex min-h-screen bg-[#111111]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto bg-[#111111]">
        {children}
      </main>
    </div>
  )
}

