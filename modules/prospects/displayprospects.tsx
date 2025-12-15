'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchProspects, Prospect } from '@/supabase/fetches/fetchpeople'

export default function DisplayProspects() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProspects = async () => {
      try {
        const data = await fetchProspects()
        setProspects(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load prospects.')
      } finally {
        setLoading(false)
      }
    }

    loadProspects()
  }, [])

  if (loading) return <div className="text-gray-300">Loading prospects...</div>
  if (error) return <div className="text-red-400">{error}</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {prospects.map((prospect) => (
        <div
          key={prospect.id}
          onClick={() => router.push(`/people/${prospect.id}`)}
          className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow p-4 overflow-hidden cursor-pointer hover:bg-[#262626] transition-colors"
        >
          <h2 className="text-lg font-semibold text-white truncate">
            {prospect.name}
          </h2>
          <p className="text-gray-300 truncate">{prospect.number}</p>
          <p
            className="text-gray-400 truncate"
            title={prospect.notes ?? ''} // show full notes on hover
          >
            {prospect.notes ?? 'No notes'}
          </p>
        </div>
      ))}
    </div>
  )
}
