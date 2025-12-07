'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash } from 'lucide-react'
import { fetchExercises } from '@/supabase/fetches/fetchexlib'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { SessionExerciseWithSets } from '@/supabase/fetches/fetchsessions'

type LocalExercise = {
  id?: string // For editing existing exercises
  exercise_id: string
  exercise_name: string
  position: number
  notes: string
  sets: LocalSet[]
}

type LocalSet = {
  id?: string // For editing existing sets
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  rpe: number | null
  notes: string | null
}

type EditWorkoutProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: string // If provided, we're editing an existing session
  initialExercises?: SessionExerciseWithSets[] // If provided, load these exercises
  onSave: (data: {
    exercises: LocalExercise[]
    sessionUpdates?: {
      start_time?: string | null
      end_time?: string | null
      workout_id?: string | null
      day_id?: string | null
    }
  }) => Promise<void>
  mode?: 'create' | 'edit' | 'in-progress' // create = new workout, edit = from template/day, in-progress = editing active session
}

export default function EditWorkout({
  open,
  onOpenChange,
  sessionId,
  initialExercises,
  onSave,
  mode = 'create',
}: EditWorkoutProps) {
  const [exercises, setExercises] = useState<LocalExercise[]>([])
  const [exerciseLibrary, setExerciseLibrary] = useState<{ id: string; name: string }[]>([])
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({})
  const [searchValue, setSearchValue] = useState<{ [key: number]: string }>({})
  const [loading, setLoading] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<string>('')
  const [sessionEndTime, setSessionEndTime] = useState<string>('')

  // Reset form when dialog opens or initialExercises change
  useEffect(() => {
    if (open) {
      if (initialExercises && initialExercises.length > 0) {
        // Load existing exercises
        const mappedExercises: LocalExercise[] = initialExercises.map((ex, idx) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name || '',
          position: ex.position,
          notes: ex.notes || '',
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
        setExercises(mappedExercises)
      } else {
        // Start fresh
        setExercises([])
      }
      setOpenCombobox({})
      setSearchValue({})
    }
  }, [open, initialExercises])

  // Fetch exercise library when dialog opens
  useEffect(() => {
    const loadLibrary = async () => {
      if (!open) return
      try {
        const data = await fetchExercises()
        setExerciseLibrary(data)
      } catch (err) {
        console.error('Failed to fetch exercises:', err)
      }
    }
    loadLibrary()
  }, [open])

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: '',
        exercise_name: '',
        position: prev.length,
        notes: '',
        sets: [],
      },
    ])
  }

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index).map((ex, i) => ({
      ...ex,
      position: i,
    })))
  }

  const updateExercise = <K extends keyof LocalExercise>(
    index: number,
    key: K,
    value: LocalExercise[K]
  ) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [key]: value } : ex)))
  }

  const addSet = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex]
    const newSetNumber = exercise.sets.length > 0
      ? Math.max(...exercise.sets.map((s) => s.set_number)) + 1
      : 1

    const newSet: LocalSet = {
      set_number: newSetNumber,
      weight: null,
      reps: null,
      rir: null,
      rpe: null,
      notes: null,
    }

    const updated = [...exercises]
    updated[exerciseIndex].sets = [...exercise.sets, newSet]
    setExercises(updated)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setExercises(updated)
  }

  const updateSet = <K extends keyof LocalSet>(
    exerciseIndex: number,
    setIndex: number,
    key: K,
    value: LocalSet[K]
  ) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [key]: value,
    }
    setExercises(updated)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave({
        exercises,
        sessionUpdates: mode === 'in-progress' ? {
          start_time: sessionStartTime || null,
          end_time: sessionEndTime || null,
        } : undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving workout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#1f1f1f] border-[#2a2a2a] text-white custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'create' && 'Assign Workout'}
            {mode === 'edit' && 'Edit Workout'}
            {mode === 'in-progress' && 'Edit Session Workout'}
          </DialogTitle>
        </DialogHeader>

        {/* Session timing (only for in-progress mode) */}
        {mode === 'in-progress' && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Start Time</label>
                <Input
                  type="datetime-local"
                  value={sessionStartTime}
                  onChange={(e) => setSessionStartTime(e.target.value)}
                  className="bg-[#111111] text-white border-[#2a2a2a]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">End Time</label>
                <Input
                  type="datetime-local"
                  value={sessionEndTime}
                  onChange={(e) => setSessionEndTime(e.target.value)}
                  className="bg-[#111111] text-white border-[#2a2a2a]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-6">
          {exercises.map((ex, index) => (
            <div key={index} className="border border-[#2a2a2a] p-3 rounded-lg relative bg-[#111111]">
              {exercises.length > 0 && (
                <button
                  onClick={() => removeExercise(index)}
                  className="absolute right-2 top-2 text-red-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash size={16} />
                </button>
              )}

              <div className="space-y-3">
                {/* Exercise Selection */}
                <div className="relative">
                  <label className="text-sm text-white">Exercise Name</label>
                  <div className="relative">
                    <Input
                      value={ex.exercise_name}
                      onChange={(e) => {
                        const value = e.target.value
                        updateExercise(index, 'exercise_name', value)
                        setSearchValue((prev) => ({ ...prev, [index]: value }))
                        setOpenCombobox((prev) => ({ ...prev, [index]: value.length > 0 }))
                      }}
                      onFocus={() => {
                        if (ex.exercise_name.length > 0 || exerciseLibrary.length > 0) {
                          setOpenCombobox((prev) => ({ ...prev, [index]: true }))
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setOpenCombobox((prev) => ({ ...prev, [index]: false }))
                        }, 200)
                      }}
                      placeholder="Type to search exercises..."
                      className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                    />
                    {openCombobox[index] && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md shadow-lg"
                        onMouseDown={(e) => {
                          e.preventDefault()
                        }}
                      >
                        <Command className="bg-[#1f1f1f] text-white">
                          <CommandInput
                            value={searchValue[index] || ex.exercise_name}
                            onValueChange={(value) => {
                              setSearchValue((prev) => ({ ...prev, [index]: value }))
                              updateExercise(index, 'exercise_name', value)
                            }}
                            placeholder="Search exercises..."
                            className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                          />
                          <CommandList className="max-h-[200px] overflow-y-auto bg-[#1f1f1f] custom-scrollbar">
                            <CommandEmpty className="text-gray-400 py-4 text-center">
                              No exercises found.
                            </CommandEmpty>
                            <CommandGroup className="bg-[#1f1f1f]">
                              {exerciseLibrary
                                .filter((exercise) => {
                                  const search = (searchValue[index] || ex.exercise_name || '').toLowerCase()
                                  return exercise.name.toLowerCase().includes(search)
                                })
                                .map((exercise) => (
                                  <CommandItem
                                    key={exercise.id}
                                    value={exercise.name}
                                    onSelect={() => {
                                      updateExercise(index, 'exercise_name', exercise.name)
                                      updateExercise(index, 'exercise_id', exercise.id)
                                      setSearchValue((prev) => ({ ...prev, [index]: exercise.name }))
                                      setOpenCombobox((prev) => ({ ...prev, [index]: false }))
                                    }}
                                    className="text-white hover:bg-[#333333] cursor-pointer data-[selected=true]:bg-[#333333] data-[selected=true]:text-white"
                                  >
                                    {exercise.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-white">Sets</label>
                    <Button
                      onClick={() => addSet(index)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white cursor-pointer h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Set
                    </Button>
                  </div>

                  {ex.sets.map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Set {set.set_number}</span>
                        <Button
                          onClick={() => removeSet(index, setIndex)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 cursor-pointer h-5 w-5 p-0"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Weight</label>
                          <Input
                            type="number"
                            value={set.weight ?? ''}
                            onChange={(e) =>
                              updateSet(index, setIndex, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                            }
                            placeholder="lbs"
                            className="bg-[#111111] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Reps</label>
                          <Input
                            type="number"
                            value={set.reps ?? ''}
                            onChange={(e) =>
                              updateSet(index, setIndex, 'reps', e.target.value ? parseInt(e.target.value) : null)
                            }
                            placeholder="reps"
                            className="bg-[#111111] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">RIR</label>
                          <Input
                            type="number"
                            value={set.rir ?? ''}
                            onChange={(e) =>
                              updateSet(index, setIndex, 'rir', e.target.value ? parseInt(e.target.value) : null)
                            }
                            placeholder="RIR"
                            className="bg-[#111111] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">RPE</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={set.rpe ?? ''}
                            onChange={(e) =>
                              updateSet(index, setIndex, 'rpe', e.target.value ? parseFloat(e.target.value) : null)
                            }
                            placeholder="RPE"
                            className="bg-[#111111] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Notes</label>
                          <Input
                            type="text"
                            value={set.notes ?? ''}
                            onChange={(e) => updateSet(index, setIndex, 'notes', e.target.value || null)}
                            placeholder="notes"
                            className="bg-[#111111] text-white border-[#2a2a2a] text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {ex.sets.length === 0 && (
                    <div className="text-center py-2 text-xs text-gray-500">
                      No sets added. Click "Add Set" to add sets for this exercise.
                    </div>
                  )}
                </div>

                {/* Exercise Notes */}
                <div>
                  <label className="text-sm text-white">Exercise Notes</label>
                  <Textarea
                    value={ex.notes}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                    placeholder="Cues, tempo, reminders..."
                    className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add exercise button */}
          <Button
            onClick={addExercise}
            variant="outline"
            className="w-full border-[#2a2a2a] bg-[#333333] text-white hover:bg-[#404040] hover:text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Add Exercise
          </Button>
        </div>

        <DialogFooter>
          <Button
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            onClick={handleSave}
            disabled={loading || exercises.length === 0}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Assign Workout' : 'Save Workout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
