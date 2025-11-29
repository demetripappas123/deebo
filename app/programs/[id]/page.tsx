'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { upsertWeek } from '@/supabase/upserts/upsertweek'
import { fetchWeeks, Week } from '@/supabase/fetches/fetchweek'
import DeleteWeekDialog from '@/modules/programs/deleteweek'
import { TrashIcon } from '@heroicons/react/24/solid'
import { addDay } from '@/supabase/upserts/upsertday'
import { upsertDayExercises, DayExercise } from '@/supabase/upserts/upsertexercises'
import { fetchExercises } from '@/supabase/fetches/fetchexlib'
import { fetchDayExercises, DayExerciseWithName } from '@/supabase/fetches/fetchdayexercises'
import AddDayDialog from '@/modules/programs/adddaydialog'

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
  // Store exercises by day_id
  const [dayExercises, setDayExercises] = useState<Record<string, DayExerciseWithName[]>>({})

  // For controlling the AddDayDialog per week
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null)

  const refreshWeeks = async () => {
    const programId = params.id
    if (!programId) return

    try {
      const weeksData = await fetchWeeks(programId as string)
      setWeeks(weeksData)

      // Fetch exercises for all days
      const allDayIds = weeksData.flatMap(week => week.days.map(day => day.id))
      const exercisesMap: Record<string, DayExerciseWithName[]> = {}

      // Fetch exercises for each day in parallel
      const exercisePromises = allDayIds.map(async (dayId) => {
        const exercises = await fetchDayExercises(dayId)
        exercisesMap[dayId] = exercises
      })

      await Promise.all(exercisePromises)
      setDayExercises(exercisesMap)
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

        await refreshWeeks()
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

  const handleAddWeek = async () => {
    if (!program) return

    try {
      const savedWeek = await upsertWeek({ program_id: program.id })
      setWeeks(prev => [...prev, savedWeek])
    } catch (err) {
      console.error('Failed to add week:', err)
    }
  }

  // Submit a new day with exercises
  const handleAddDaySubmit = async (payload: { dayName: string; exercises: any[] }) => {
    if (!activeWeekId) return

    try {
      // 1. Create the day and get its ID
      const newDay = await addDay(activeWeekId, payload.dayName)
      if (!newDay) {
        throw new Error('Failed to create day')
      }

      // 2. Fetch exercise library to map exercise names to IDs
      const exerciseLibrary = await fetchExercises()

      // 3. Map exercises to DayExercise format
      const mappedExercises: DayExercise[] = payload.exercises
        .filter(ex => ex.name.trim() !== '') // Only include exercises with names
        .map(ex => {
          // Find exercise_id by matching name in exercise library
          const exercise = exerciseLibrary.find(e => e.name === ex.name)
          if (!exercise) {
            throw new Error(`Exercise "${ex.name}" not found in library`)
          }

          return {
            day_id: newDay.id,
            exercise_def_id: exercise.id,
            sets: ex.sets,
            reps: ex.reps,
            rir: ex.rir ?? null,
            rpe: ex.rpe ?? null,
            notes: ex.notes || '',
            weight_used: ex.weight ?? null,
          }
        })

      // 4. Upsert the exercises if there are any
      if (mappedExercises.length > 0) {
        await upsertDayExercises(mappedExercises)
      }

      // 5. Refresh weeks to show the new day
      await refreshWeeks()
    } catch (err) {
      console.error('Failed to add day:', err)
    } finally {
      setActiveWeekId(null) // close the dialog
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
                      className="p-3 border border-gray-500 rounded-md bg-[#111111] min-w-[200px]"
                    >
                      <div className="font-semibold text-white mb-2">{day.name}</div>
                      {dayExercises[day.id] && dayExercises[day.id].length > 0 ? (
                        <div className="space-y-1">
                          {dayExercises[day.id].map((exercise, idx) => (
                            <div
                              key={idx}
                              className="text-sm text-gray-300 border-l-2 border-orange-500 pl-2"
                            >
                              <div className="font-medium text-white">{exercise.exercise_name}</div>
                              <div className="text-xs text-gray-400">
                                {exercise.sets}×{exercise.reps}
                                {exercise.weight_used && ` @ ${exercise.weight_used}lbs`}
                                {exercise.rir !== null && ` (RIR: ${exercise.rir})`}
                                {exercise.rpe !== null && ` (RPE: ${exercise.rpe})`}
                              </div>
                              {exercise.notes && (
                                <div className="text-xs text-gray-500 italic mt-1">{exercise.notes}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No exercises</div>
                      )}
                    </div>
                  ))}

                  {/* Add Day button */}
                  <button
                    className="p-2 border border-dashed border-gray-500 rounded-md text-gray-300 cursor-pointer flex items-center justify-center"
                    onClick={() => setActiveWeekId(week.id)}
                  >
                    + Add Day
                  </button>

                  {/* Controlled Dialog */}
                  <AddDayDialog
                    open={activeWeekId === week.id}
                    onClose={() => setActiveWeekId(null)}
                    weekId={week.id}
                    onAdded={refreshWeeks}
                    onSubmit={handleAddDaySubmit}
                  />
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
