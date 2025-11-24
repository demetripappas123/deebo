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
import { upsertEvent, EventFormData } from '@/supabase/upserts/upsertevent'
import { fetchClients, Client } from '@/supabase/fetches/fetchclients'
import { fetchProspects, Prospect } from '@/supabase/fetches/fetchprospects'

export default function AddEventDialog() {
  const [type, setType] = useState('Client Session')
  const [title, setTitle] = useState('')
  const [personId, setPersonId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string>(new Date().toISOString().slice(0,16))
  const [duration, setDuration] = useState<number>(60)
  const [status, setStatus] = useState<'past' | 'future' | 'in_progress'>('future')
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
  const isClientType = type === 'Client Session'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const eventData: Partial<EventFormData> = {
      title,
      type,
      client_id: isClientType ? personId : null,
      prospect_id: isClientType ? null : personId,
      start_time: new Date(startTime).toISOString(),
      duration_minutes: duration,
      status,
    }

    try {
      await upsertEvent(eventData)
      alert('Event created!')
      // Reset form
      setTitle('')
      setType('Client Session')
      setPersonId(null)
      setStartTime(new Date().toISOString().slice(0,16))
      setDuration(60)
      setStatus('future')
    } catch (err) {
      console.error(err)
      alert('Error creating event.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
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
            <option value="">Select {isClientType ? 'Client' : 'Prospect'}</option>
            {(isClientType ? clients : prospects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Date / Time */}
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Duration */}
          <input
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            min={1}
          />

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="future">Future</option>
            <option value="in_progress">In Progress</option>
            <option value="past">Past</option>
          </select>

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
