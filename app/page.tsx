'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to dashboard
    router.replace('/dash')
  }, [router])

  // Return null while redirecting
  return null
}
