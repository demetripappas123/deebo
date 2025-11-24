'use client'

import React, { useState } from 'react'
import { deleteWeek } from '@/supabase/deletions/deleteweek'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type DeleteWeekDialogProps = {
  weekId: string
  weekNumber: number
  onDeleted?: () => void
  children: React.ReactNode
}

export default function DeleteWeekDialog({
  weekId,
  weekNumber,
  onDeleted,
  children,
}: DeleteWeekDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteWeek(weekId)
      setIsDialogOpen(false)
      if (onDeleted) onDeleted()
    } catch (error) {
      console.error('Error deleting week:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setIsDialogOpen(true)}>
        {children}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1f1f1f] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Week</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete this week?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
              className="cursor-pointer bg-[#333333] text-white border-[#2a2a2a] hover:bg-[#404040] hover:text-white"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
