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
import { createSession } from '@/supabase/upserts/createsession'
import { useRouter } from 'next/navigation'
import { fetchClients, Client } from '@/supabase/fetches/fetchpeople'
import { fetchProspects, Prospect } from '@/supabase/fetches/fetchpeople'
import { SessionType } from '@/supabase/fetches/fetchsessions'
import { upsertProspect, ProspectFormData } from '@/supabase/upserts/upsertperson'

export default function AddEventDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SessionType>('Client Session')
  const [personId, setPersonId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string>(new Date().toISOString().slice(0,16))
  const [clients, setClients] = useState<Client[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [addProspectOpen, setAddProspectOpen] = useState(false)
  const [prospectName, setProspectName] = useState('')
  const [prospectNumber, setProspectNumber] = useState('')
  const [prospectNotes, setProspectNotes] = useState('')
  const [addingProspect, setAddingProspect] = useState(false)

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
  // Only "Client Session" uses clients, all other types use prospects
  const isClientType = type === 'Client Session'
  const isProspectType = type !== 'Client Session'

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prospectName.trim()) {
      alert('Please enter a prospect name')
      return
    }

    setAddingProspect(true)
    const prospectData: ProspectFormData = {
      name: prospectName,
      number: prospectNumber || undefined,
      notes: prospectNotes || undefined,
    }

    try {
      const result = await upsertProspect(prospectData)
      // Refresh prospects list
      const prospectsData = await fetchProspects()
      setProspects(prospectsData)
      // Select the newly created prospect
      if (result && result[0]) {
        setPersonId(result[0].id)
      }
      // Reset form and close dialog
      setProspectName('')
      setProspectNumber('')
      setProspectNotes('')
      setAddProspectOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error creating prospect.')
    } finally {
      setAddingProspect(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId) {
      alert('Please select a client or prospect')
      return
    }
    
    setLoading(true)

    try {
      const newSession = await createSession({
        type,
        person_id: personId,
        start_time: new Date(startTime).toISOString(), // Scheduled time
        trainer_id: null,
        converted: false,
      })
      
      // Navigate to the session page where workout can be assigned
      router.push(`/events/${newSession.id}`)
      
      // Reset form
      setType('Client Session')
      setPersonId(null)
      setStartTime(new Date().toISOString().slice(0,16))
      // Close the dialog
      setOpen(false)
    } catch (err) {
      console.error('Error creating session:', err)
      alert('Error creating session. Please check the console for details.')
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
            onChange={(e) => {
              setType(e.target.value as SessionType)
              setPersonId(null) // Reset person selection when type changes
            }}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option>KO</option>
            <option>KOFU</option>
            <option>SGA</option>
            <option>Client Session</option>
            <option>Prospect Session</option>
          </select>

          {/* Person dropdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={personId ?? ''}
                onChange={(e) => setPersonId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="">Select {isClientType ? 'Client' : 'Prospect'}</option>
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
              {isProspectType && (
                <Button
                  type="button"
                  onClick={() => setAddProspectOpen(true)}
                  className="bg-[#333333] text-white hover:bg-[#404040] cursor-pointer whitespace-nowrap"
                >
                  + Add Prospect
                </Button>
              )}
            </div>
          </div>

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

        {/* Add Prospect Dialog */}
        <Dialog open={addProspectOpen} onOpenChange={setAddProspectOpen}>
          <DialogContent className="sm:max-w-lg bg-[#1f1f1f] text-white border border-[#2a2a2a]">
            <DialogHeader>
              <DialogTitle>Add New Prospect</DialogTitle>
              <DialogDescription>
                Create a new prospect to assign to this session.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddProspect} className="grid gap-4 py-4">
              <input
                type="text"
                placeholder="Name *"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
              <input
                type="text"
                placeholder="Number"
                value={prospectNumber}
                onChange={(e) => setProspectNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <textarea
                placeholder="Notes"
                value={prospectNotes}
                onChange={(e) => setProspectNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-24 resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setAddProspectOpen(false)
                    setProspectName('')
                    setProspectNumber('')
                    setProspectNotes('')
                  }}
                  className="bg-[#333333] text-white hover:bg-[#404040] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:bg-orange-300 cursor-pointer disabled:cursor-not-allowed"
                  disabled={addingProspect}
                >
                  {addingProspect ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
