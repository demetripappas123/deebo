'use client'

import React, { useState } from 'react'
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
import { upsertProspect, ProspectFormData } from '@/supabase/upserts/upsertprospect'

export default function AddProspectDialog() {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const prospectData: ProspectFormData = { name, number, notes }

    try {
      await upsertProspect(prospectData)
      setName('')
      setNumber('')
      setNotes('')
      alert('Prospect saved!')
    } catch (err) {
      console.error(err)
      alert('Error saving prospect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white font-semibold hover:bg-orange-600 cursor-pointer">
          Add Prospect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-[#1f1f1f] text-white border border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle>Add New Prospect</DialogTitle>
          <DialogDescription>
            Fill out the information to create a new prospect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          />
          <input
            type="text"
            placeholder="Number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[#262626] border border-[#333333] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-24 resize-none"
          />
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
