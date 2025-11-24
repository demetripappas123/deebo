'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addDay } from '@/supabase/upserts/upsertday' // ⬅ NEW

export function AddDayDialog({
  weekId,
  onAdded,
  children
}: {
  weekId: string
  onAdded: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [dayName, setDayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!dayName.trim()) return

    setLoading(true)
    const newDay = await addDay(weekId, dayName) // ⬅ CALLS YOUR FUNCTION
    setLoading(false)

    if (!newDay) {
      console.error('Failed to add day')
      return
    }

    setOpen(false)
    onAdded()
    setDayName('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="bg-[#1c1c1c] text-white border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Day</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Day name"
          value={dayName}
          onChange={e => setDayName(e.target.value)}
          className="bg-[#2d2d2d] text-white border-gray-600"
        />

        <DialogFooter className="mt-4">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            className="bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Adding...' : 'Add Day'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
