'use client'

import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/authcontext'
import { fetchClients, Client } from '@/supabase/fetches/fetchpeople'

export interface DisplayClientsRef {
  refresh: () => Promise<void>
}

const DisplayClients = forwardRef<DisplayClientsRef>((props, ref) => {
  const router = useRouter()
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClients = async () => {
    setLoading(true)
    try {
      const data = await fetchClients(user?.id || null)
      setClients(data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Failed to load clients.')
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    refresh: loadClients,
  }))

  useEffect(() => {
    if (user) {
      loadClients()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (loading) return <div className="text-muted-foreground">Loading clients...</div>
  if (error) return <div className="text-destructive">{error}</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {clients.map((client) => (
        <div
          key={client.id}
          onClick={() => router.push(`/people/${client.id}`)}
          className="bg-card border border-border rounded-lg shadow p-4 overflow-hidden cursor-pointer hover:bg-muted transition-colors"
        >
          <h2 className="text-lg font-semibold text-foreground truncate">
            {client.name}
          </h2>
          <p className="text-muted-foreground truncate">{client.number}</p>
          <p
            className="text-muted-foreground truncate"
            title={client.notes ?? ''} // full notes on hover
          >
            {client.notes ?? 'No notes'}
          </p>
        </div>
      ))}
    </div>
  )
})

DisplayClients.displayName = 'DisplayClients'

export default DisplayClients
