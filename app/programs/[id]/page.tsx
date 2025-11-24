'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { upsertWeek } from '@/supabase/upserts/upsertweek'
import { fetchWeeks, Week } from '@/supabase/fetches/fetchweek'
import DeleteWeekDialog from '@/modules/programs/deleteweek'
import { TrashIcon } from '@heroicons/react/24/solid'
import { AddDayDialog } from '@/modules/programs/adddaydialog' // ⬅ ADDED

type Program = {
  id: string
  name: string
  description?: string | null
}

export default function ProgramPage() {
  const params = useParams()
  const router = useRouter()

  const [program, setProgram] = useState<Program | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)

  const refreshWeeks = async () => {
    const programId = params.id
    if (!programId) return

    try {
      const weeksData = await fetchWeeks(programId as string)
      setWeeks(weeksData)
    } catch (err) {
      console.error('Failed to fetch weeks:', err)
    }
  }

  useEffect(() => {
    const loadProgram = async () => {
      const programId = params.id
      if (!programId) return setLoading(false)

      setLoading(true)
      try {
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single()

        if (programError) {
          console.error('Error loading program:', programError)
          setProgram(null)
        } else {
          setProgram(programData)
        }

        const weeksData = await fetchWeeks(programId as string)
        setWeeks(weeksData)
      } catch (err) {
        console.error('Unexpected error loading program:', err)
        setProgram(null)
        setWeeks([])
      } finally {
        setLoading(false)
      }
    }

    loadProgram()
  }, [params.id])

  // Add Week (unchanged)
  const handleAddWeek = async () => {
    if (!program) return

    try {
      const savedWeek = await upsertWeek({ program_id: program.id })
      setWeeks(prev => [...prev, savedWeek])
    } catch (err) {
      console.error('Failed to add week:', err)
    }
  }

  if (loading) return <p className="text-gray-300">Loading program...</p>
  if (!program) return <p className="text-gray-300">Program not found.</p>

  return (
    <div className="p-6 space-y-4 bg-[#111111] min-h-screen text-white">
      <button
        onClick={() => router.back()}
        className="px-3 py-1 bg-[#333333] rounded-md hover:bg-[#404040]"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">{program.name}</h1>
      {program.description && (
        <p className="text-gray-300">{program.description}</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleAddWeek}
          className="px-4 py-2 bg-orange-500 rounded-md hover:bg-orange-600 cursor-pointer"
        >
          Add Week
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {weeks.length === 0 && (
          <p className="text-gray-300">No weeks yet. Add one!</p>
        )}

        {weeks.map(week => (
          <div
            key={week.id}
            className="flex items-start justify-between p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md"
          >
            <div className="flex-1">
              <p className="text-white font-semibold mb-2">Week {week.number}</p>

              <div className="flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap items-center">
                  {week.days.map(day => (
                    <div
                      key={day.id}
                      className="p-2 border border-gray-500 rounded-md text-gray-300"
                    >
                      {day.name}
                    </div>
                  ))}

                  {/* ⬇⬇ NEW: AddDayDialog */}
                  <AddDayDialog weekId={week.id} onAdded={refreshWeeks}>
                    <div
                      className="p-2 border border-dashed border-gray-500 rounded-md text-gray-300 cursor-pointer flex items-center justify-center"
                    >
                      + Add Day
                    </div>
                  </AddDayDialog>
                </div>

                <DeleteWeekDialog
                  weekId={week.id}
                  weekNumber={week.number}
                  onDeleted={refreshWeeks}
                >
                  <TrashIcon className="w-6 h-6 text-red-500 hover:text-red-600 cursor-pointer" />
                </DeleteWeekDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
