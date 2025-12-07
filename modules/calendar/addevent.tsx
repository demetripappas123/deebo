'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { upsertSession, SessionFormData } from '@/supabase/upserts/upsertsession'
import { fetchClients, Client } from '@/supabase/fetches/fetchclients'
import { fetchProspects, Prospect } from '@/supabase/fetches/fetchprospects'
import { SessionType } from '@/supabase/fetches/fetchsessions'

export default function AddEventDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SessionType>('Client Session')
  const [personId, setPersonId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string>(new Date().toISOString().slice(0,16))
  const [clients, setClients] = useState<Client[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)

  // Load clients and prospects
  useEffect(() => {
    const loadPeople = async () => {
      const clientsData = await fetchClients()
      setClients(clientsData)
      const prospectsData = await fetchProspects()
      setProspects(prospectsData)
    }
    loadPeople()
  }, [])

  // Determine if we should show clients or prospects
  const isClientType = type === 'Client Session' || type === 'KO' || type === 'SGA' || type === 'KOFU'
  const isProspectType = type === 'Prospect Session'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId) {
      alert('Please select a client or prospect')
      return
    }
    
    setLoading(true)

    const sessionData: SessionFormData = {
      type,
      status: 'pending',
      client_id: isClientType ? personId : null,
      prospect_id: isClientType ? null : personId,
      start_time: new Date(startTime).toISOString(),
      trainer_id: null,
    }

    try {
      await upsertSession(sessionData)
      alert('Session created!')
      // Reset form
      setType('Client Session')
      setPersonId(null)
      setStartTime(new Date().toISOString().slice(0,16))
      // Close the dialog
      setOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error creating session.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white font-semibold hover:bg-orange-600 cursor-pointer">
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-[#1f1f1f] text-white border border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Fill out the information to create a new session or event.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Type */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option>KO</option>
            <option>KOFU</option>
            <option>SGA</option>
            <option>Client Session</option>
            <option>Prospect Session</option>
          </select>

          {/* Person dropdown */}
          <select
            value={personId ?? ''}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          >
            <option value="">Select {isClientType ? 'Client' : isProspectType ? 'Prospect' : 'Client or Prospect'}</option>
            {isClientType && clients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {isProspectType && prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Date / Time */}
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
            <Button className="bg-[#333333] text-white hover:bg-[#404040] cursor-pointer">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:bg-orange-300 cursor-pointer disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
