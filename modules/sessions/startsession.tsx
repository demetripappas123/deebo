'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, Trash2, Play, Pause, RotateCcw } from 'lucide-react'
import { SessionWithExercises } from '@/supabase/fetches/fetchsessions'
import { upsertExerciseSet, upsertSessionExercise, upsertSession } from '@/supabase/upserts/upsertsession'

type TrackedSet = {
  id?: string
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  rpe: number | null
  notes: string | null
}

type TrackedExercise = {
  exercise_id: string
  exercise_name: string
  session_exercise_id?: string
  position: number
  notes: string | null
  sets: TrackedSet[]
}

type StartSessionProps = {
  session: SessionWithExercises
  onSessionComplete: () => Promise<void>
  onCancel: () => void
}

export default function StartSession({
  session,
  onSessionComplete,
  onCancel,
}: StartSessionProps) {
  const [exercises, setExercises] = useState<TrackedExercise[]>([])
  const [loading, setLoading] = useState(false)
  
  // Timer state
  const [timeElapsed, setTimeElapsed] = useState(0) // in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)

  // Initialize exercises from session data
  useEffect(() => {
    if (session.exercises) {
      const trackedExercises: TrackedExercise[] = (session.exercises || []).map((ex) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name || 'Unknown Exercise',
        session_exercise_id: ex.id,
        position: ex.position,
        notes: ex.notes,
        sets: (ex.sets || []).map((set) => ({
          id: set.id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
          rpe: set.rpe,
          notes: set.notes,
        })),
      }))
      setExercises(trackedExercises)
    }
  }, [session.exercises])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning && startTime !== null) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, startTime])

  const handleStartPause = () => {
    if (isRunning) {
      setIsRunning(false)
    } else {
      // Calculate the offset based on current elapsed time
      const offset = timeElapsed * 1000
      setStartTime(Date.now() - offset)
      setIsRunning(true)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeElapsed(0)
    setStartTime(null)
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const updateExerciseNotes = (index: number, notes: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, notes } : ex))
    )
  }

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof TrackedSet,
    value: any
  ) => {
    setExercises((prev) => {
      const updated = [...prev]
      updated[exerciseIndex].sets[setIndex] = {
        ...updated[exerciseIndex].sets[setIndex],
        [field]: value === '' ? null : value,
      }
      return updated
    })
  }

  const addSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev]
      const exercise = updated[exerciseIndex]
      const newSetNumber = exercise.sets.length > 0
        ? Math.max(...exercise.sets.map((s) => s.set_number)) + 1
        : 1

      // Create a new exercise object with updated sets array
      updated[exerciseIndex] = {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            set_number: newSetNumber,
            weight: null,
            reps: null,
            rir: null,
            rpe: null,
            notes: null,
          },
        ],
      }
      return updated
    })
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev]
      updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, idx) => idx !== setIndex)
      // Re-number sets after removal to keep them sequential
      updated[exerciseIndex].sets = updated[exerciseIndex].sets.map((set, idx) => ({
        ...set,
        set_number: idx + 1,
      }))
      return updated
    })
  }

  const handleFinishSession = async () => {
    setLoading(true)
    try {
      // Update each exercise's notes
      for (const exercise of exercises) {
        if (exercise.session_exercise_id) {
          await upsertSessionExercise({
            id: exercise.session_exercise_id,
            session_id: session.id,
            exercise_id: exercise.exercise_id,
            position: exercise.position,
            notes: exercise.notes || null,
          })
        }
      }

      // Update all sets for each exercise
      for (const exercise of exercises) {
        if (exercise.session_exercise_id) {
          // Use upsertExerciseSet which handles both inserts (when id is undefined) and updates
          for (const set of exercise.sets) {
            await upsertExerciseSet({
              id: set.id, // undefined for new sets, will create new ones
              session_exercise_id: exercise.session_exercise_id,
              set_number: set.set_number,
              weight: set.weight ?? null,
              reps: set.reps ?? null,
              rir: set.rir ?? null,
              rpe: set.rpe ?? null,
              notes: set.notes ?? null,
            })
          }
        }
      }

      // Update session status to completed
      await upsertSession({
        id: session.id,
        type: session.type,
        status: 'completed',
        client_id: session.client_id,
        prospect_id: session.prospect_id,
        trainer_id: session.trainer_id,
        start_time: session.start_time,
        end_time: new Date().toISOString(), // Set end time when completing
        workout_id: session.workout_id,
        day_id: session.day_id,
      })

      await onSessionComplete()
      alert('Session completed successfully!')
    } catch (error) {
      console.error('Error completing session:', error)
      alert('Error completing session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Track Session Workout</h1>
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-4 py-2">
              <span className="text-2xl font-mono font-semibold text-white">
                {formatTime(timeElapsed)}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handleStartPause}
                  variant="outline"
                  size="sm"
                  className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
                >
                  {isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
                  disabled={timeElapsed === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={onCancel}
              variant="outline"
              className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {exercises.map((exercise, exerciseIndex) => (
            <div
              key={exerciseIndex}
              className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {exercise.position + 1}. {exercise.exercise_name}
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">
                    Exercise Notes
                  </label>
                  <Textarea
                    value={exercise.notes || ''}
                    onChange={(e) => updateExerciseNotes(exerciseIndex, e.target.value)}
                    placeholder="Add notes for this exercise..."
                    className="bg-[#1f1f1f] text-white border-[#2a2a2a] min-h-[60px]"
                  />
                </div>
              </div>

              {/* Sets */}
              <div className="space-y-3">
                <div className="grid grid-cols-8 gap-2 text-xs font-semibold text-gray-400 pb-2 border-b border-[#2a2a2a]">
                  <div>Set</div>
                  <div>Weight</div>
                  <div>Reps</div>
                  <div>RIR</div>
                  <div>RPE</div>
                  <div>Notes</div>
                  <div></div>
                  <div></div>
                </div>

                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className="grid grid-cols-8 gap-2 items-center"
                  >
                    <div className="text-sm text-gray-300">{set.set_number}</div>
                    <Input
                      type="number"
                      step="0.5"
                      value={set.weight ?? ''}
                      onChange={(e) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'weight',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Weight"
                      className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <Input
                      type="number"
                      value={set.reps ?? ''}
                      onChange={(e) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'reps',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Reps"
                      className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <Input
                      type="number"
                      value={set.rir ?? ''}
                      onChange={(e) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'rir',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="RIR"
                      className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      value={set.rpe ?? ''}
                      onChange={(e) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'rpe',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="RPE"
                      className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <Input
                      type="text"
                      value={set.notes || ''}
                      onChange={(e) =>
                        updateSet(exerciseIndex, setIndex, 'notes', e.target.value || null)
                      }
                      placeholder="Notes"
                      className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8"
                    />
                    <div></div>
                    <button
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      className="p-1 text-red-500 hover:text-red-600 cursor-pointer flex items-center justify-center"
                      title="Remove set"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add Set Button */}
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    addSet(exerciseIndex)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border-[#2a2a2a] cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Set
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[#2a2a2a] flex justify-end gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFinishSession}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer px-8"
          >
            {loading ? 'Finishing...' : 'Finish Session'}
          </Button>
        </div>
      </div>
    </main>
  )
}

