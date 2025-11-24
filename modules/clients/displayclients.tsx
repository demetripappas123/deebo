'use client'

import React, { useEffect, useState } from 'react'
import { fetchClients, Client } from '@/supabase/fetches/fetchclients'

export default function DisplayClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await fetchClients()
        setClients(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load clients.')
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [])

  if (loading) return <div className="text-gray-300">Loading clients...</div>
  if (error) return <div className="text-red-400">{error}</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {clients.map((client) => (
        <div
          key={client.id}
          className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow p-4 overflow-hidden"
        >
          <h2 className="text-lg font-semibold text-white truncate">
            {client.name}
          </h2>
          <p className="text-gray-300 truncate">{client.number}</p>
          <p
            className="text-gray-400 truncate"
            title={client.notes ?? ''} // full notes on hover
          >
            {client.notes ?? 'No notes'}
          </p>
        </div>
      ))}
    </div>
  )
}
