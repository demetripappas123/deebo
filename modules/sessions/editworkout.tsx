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
  hideDialog?: boolean // If true, render without Dialog wrapper (for full-screen overlay)
}

export default function EditWorkout({
  open,
  onOpenChange,
  sessionId,
  initialExercises,
  onSave,
  mode = 'create',
  hideDialog = false,
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
      if (!open) {
        setExerciseLibrary([]) // Clear when dialog closes
        return
      }
      console.log('Loading exercise library...')
      try {
        const data = await fetchExercises()
        console.log('Exercise library fetched:', data)
        console.log('Exercise library count:', data.length)
        if (data && data.length > 0) {
          setExerciseLibrary(data)
          console.log('Exercise library set successfully')
        } else {
          console.warn('Exercise library is empty')
          setExerciseLibrary([])
        }
      } catch (err) {
        console.error('Failed to fetch exercises:', err)
        setExerciseLibrary([]) // Reset to empty array on error
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
      position: i, // Ensure positions are renumbered starting from 0
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
      // Validate that all exercises have valid exercise_id
      const exercisesWithoutId = exercises.filter(ex => !ex.exercise_id || ex.exercise_id.trim() === '')
      if (exercisesWithoutId.length > 0) {
        alert(`Please select an exercise for all exercise entries. ${exercisesWithoutId.length} exercise(s) are missing a selection.`)
        setLoading(false)
        return
      }

      // Ensure all exercises have correct positions (0-indexed)
      const exercisesWithPositions = exercises.map((ex, index) => ({
        ...ex,
        position: index, // Force position to match array index
      }))
      
      await onSave({
        exercises: exercisesWithPositions,
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

  if (!open) return null

  const content = (
    <>
      {!hideDialog && (
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'create' && 'Assign Workout'}
            {mode === 'edit' && 'Edit Workout'}
            {mode === 'in-progress' && 'Edit Session Workout'}
          </DialogTitle>
        </DialogHeader>
      )}

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

        {/* Exercises - Compact layout matching display UI */}
        <div className="space-y-3 mt-4">
          {exercises.map((ex, index) => (
            <div key={index} className="bg-[#1a1a1a] rounded-md p-3 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 relative">
                  <div className="relative inline-block">
                    <span className="text-md font-medium text-white mr-1">{index + 1}.</span>
                    <Input
                      value={ex.exercise_name || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        updateExercise(index, 'exercise_name', value)
                        setSearchValue((prev) => ({ ...prev, [index]: value }))
                        if (exerciseLibrary.length > 0) {
                          setOpenCombobox((prev) => ({ ...prev, [index]: true }))
                        }
                      }}
                      onFocus={() => {
                        if (exerciseLibrary.length > 0) {
                          setOpenCombobox((prev) => ({ ...prev, [index]: true }))
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setOpenCombobox((prev) => ({ ...prev, [index]: false }))
                        }, 200)
                      }}
                      placeholder="Exercise name..."
                      className="bg-transparent border-none text-md font-medium text-white p-0 h-auto w-auto inline-block focus:ring-0 focus-visible:ring-0 min-w-[200px]"
                    />
                    {openCombobox[index] && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-[#111111] border border-[#2a2a2a] rounded-md shadow-lg"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Command className="bg-[#111111] text-white">
                          <CommandInput
                            value={searchValue[index] || ex.exercise_name || ''}
                            onValueChange={(value) => {
                              setSearchValue((prev) => ({ ...prev, [index]: value }))
                              updateExercise(index, 'exercise_name', value)
                            }}
                            placeholder="Search exercises..."
                            className="bg-[#111111] text-white border-[#2a2a2a]"
                          />
                          <CommandList className="max-h-[200px] overflow-y-auto bg-[#111111]">
                            <CommandEmpty className="text-gray-400 py-4 text-center">No exercises found.</CommandEmpty>
                            <CommandGroup className="bg-[#111111]">
                              {exerciseLibrary.length > 0 ? (
                                exerciseLibrary
                                  .filter((exercise) => {
                                    const search = (searchValue[index] || ex.exercise_name || '').toLowerCase()
                                    return search === '' || exercise.name.toLowerCase().includes(search)
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
                                      className="text-white hover:bg-[#2a2a2a] cursor-pointer bg-[#111111]"
                                    >
                                      {exercise.name}
                                    </CommandItem>
                                  ))
                              ) : (
                                <div className="text-gray-400 py-2 px-4 text-sm">Loading exercises...</div>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={ex.notes || ''}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="bg-transparent border-none text-xs text-gray-400 p-0 h-auto w-32 focus:ring-0"
                  />
                  <button
                    onClick={() => removeExercise(index)}
                    className="p-1 text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>

              {ex.sets && ex.sets.length > 0 && (
                <div className="space-y-1">
                  <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-400 pb-1 border-b border-[#2a2a2a]">
                    <div>Set</div>
                    <div>Weight</div>
                    <div>Reps</div>
                    <div>RIR</div>
                    <div>RPE</div>
                    <div>Notes</div>
                  </div>
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-6 gap-2 text-xs items-center">
                      <div className="text-gray-300">{set.set_number}</div>
                      <Input
                        type="number"
                        step="0.01"
                        value={set.weight ?? ''}
                        onChange={(e) => updateSet(index, setIdx, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="-"
                        className="bg-transparent border-none text-gray-300 p-0 h-6 text-xs focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <Input
                        type="number"
                        value={set.reps ?? ''}
                        onChange={(e) => updateSet(index, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="-"
                        className="bg-transparent border-none text-gray-300 p-0 h-6 text-xs focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <Input
                        type="number"
                        value={set.rir ?? ''}
                        onChange={(e) => updateSet(index, setIdx, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="-"
                        className="bg-transparent border-none text-gray-300 p-0 h-6 text-xs focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={set.rpe ?? ''}
                        onChange={(e) => updateSet(index, setIdx, 'rpe', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="-"
                        className="bg-transparent border-none text-gray-300 p-0 h-6 text-xs focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={set.notes ?? ''}
                          onChange={(e) => updateSet(index, setIdx, 'notes', e.target.value || null)}
                          placeholder="-"
                          className="bg-transparent border-none text-gray-300 p-0 h-6 text-xs truncate flex-1 focus:ring-0"
                        />
                        <button
                          onClick={() => removeSet(index, setIdx)}
                          className="p-0.5 text-red-400 hover:text-red-300 cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {ex.sets.length === 0 && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">No sets</span>
                  <Button
                    onClick={() => addSet(index)}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Set
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add exercise button */}
          <Button
            onClick={addExercise}
            variant="outline"
            className="w-full border-[#2a2a2a] bg-[#333333] text-white hover:bg-[#404040] hover:text-white flex items-center justify-center gap-2 cursor-pointer text-sm py-2"
          >
            <Plus size={16} /> Add Exercise
          </Button>
        </div>

      {!hideDialog && (
        <DialogFooter>
          <Button
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            onClick={handleSave}
            disabled={loading || exercises.length === 0}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Assign Workout' : 'Save Workout'}
          </Button>
        </DialogFooter>
      )}
      {hideDialog && (
        <div className="mt-6">
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            onClick={handleSave}
            disabled={loading || exercises.length === 0}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Assign Workout' : 'Save Workout'}
          </Button>
        </div>
      )}
    </>
  )

  if (hideDialog) {
    return <div className="space-y-6" style={{ overflow: 'visible' }}>{content}</div>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#1f1f1f] border-[#2a2a2a] text-white custom-scrollbar">
        {content}
      </DialogContent>
    </Dialog>
  )
}
