'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { upsertClient, ClientFormData } from '@/supabase/upserts/upsertperson'
import { useAuth } from '@/context/authcontext'

interface AddClientDialogProps {
  onClientAdded?: () => void
}

export default function AddClientDialog({ onClientAdded }: AddClientDialogProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const clientData: ClientFormData = { name, number, notes }

    try {
      await upsertClient(clientData, user?.id || null)
      setName('')
      setNumber('')
      setNotes('')
      setOpen(false) // Close dialog on success
      router.refresh() // Refresh the page to show the new client
      onClientAdded?.() // Trigger parent refresh callback
    } catch (err) {
      console.error(err)
      alert('Error saving client.')
    } finally {
      setLoading(false)
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset form when closing
      setName('')
      setNumber('')
      setNotes('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer">
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground border border-border">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Fill out the information to create a new client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <input
            type="text"
            placeholder="Number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary h-24 resize-none"
          />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button className="bg-muted text-foreground hover:bg-muted/80 cursor-pointer">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:bg-primary/50 cursor-pointer disabled:cursor-not-allowed"
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
