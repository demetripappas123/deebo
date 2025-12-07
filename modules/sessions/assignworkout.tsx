'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import EditWorkout from './editworkout'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { SessionType } from '@/supabase/fetches/fetchsessions'
import { supabase } from '@/supabase/supabaseClient'

type AssignWorkoutProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionType?: SessionType
  clientId?: string | null
  prospectId?: string | null
}

type WorkoutOption = 'create' | 'program' | 'existing' | null

export default function AssignWorkout({ 
  open, 
  onOpenChange, 
  sessionId,
  sessionType,
  clientId,
  prospectId
}: AssignWorkoutProps) {
  const [selectedOption, setSelectedOption] = useState<WorkoutOption>(null)
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false)

  const handleOptionSelect = (option: WorkoutOption) => {
    if (option === 'create') {
      // Close assign dialog and open workout editor
      setShowWorkoutEditor(true)
      onOpenChange(false)
    } else {
      setSelectedOption(option)
    }
  }

  const handleCancel = () => {
    setSelectedOption(null)
    onOpenChange(false)
  }

  const handleWorkoutSave = async (data: {
    exercises: any[]
    sessionUpdates?: {
      start_time?: string | null
      end_time?: string | null
      workout_id?: string | null
      day_id?: string | null
    }
  }) => {
    try {
      if (!clientId && !prospectId) {
        throw new Error('Client ID or Prospect ID is required to assign a workout')
      }

      // Update the session with workout information
      const session = await upsertSession({
        id: sessionId,
        client_id: clientId || null,
        prospect_id: prospectId || null,
        trainer_id: null,
        type: sessionType || 'Client Session',
        status: 'pending',
        start_time: data.sessionUpdates?.start_time ?? null,
        end_time: data.sessionUpdates?.end_time ?? null,
        workout_id: data.sessionUpdates?.workout_id ?? null,
        day_id: data.sessionUpdates?.day_id ?? null,
      })

      // Create session exercises and sets
      for (let i = 0; i < data.exercises.length; i++) {
        const exercise = data.exercises[i]
        
        // Create session exercise
        const sessionExercise = await upsertSessionExercise({
          session_id: session.id,
          exercise_id: exercise.exercise_id,
          position: i,
          notes: exercise.notes || null,
        })

        // Create sets for this exercise
        if (exercise.sets && exercise.sets.length > 0) {
          for (const set of exercise.sets) {
            await upsertExerciseSet({
              session_exercise_id: sessionExercise.id,
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

      console.log('Workout assigned successfully!')
      setShowWorkoutEditor(false)
      onOpenChange(false) // Close the assign dialog as well
    } catch (error) {
      console.error('Error assigning workout:', error)
      alert('Error assigning workout. Please try again.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1f1f1f] border-[#2a2a2a] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            Assign Workout to Session{sessionType ? ` - ${sessionType}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {!selectedOption ? (
            // Initial selection screen
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                Choose how you'd like to assign a workout:
              </p>
              
              <Button
                onClick={() => handleOptionSelect('create')}
                variant="outline"
                className="w-full justify-start text-left h-auto bg-[#111111] hover:bg-[#1a1a1a] text-white border-[#2a2a2a] cursor-pointer p-4"
              >
                <div className="flex flex-col items-start w-full">
                  <span className="font-semibold text-white text-base">Create New Workout</span>
                  <span className="text-xs text-gray-400 mt-1.5">
                    Build a custom workout from scratch
                  </span>
                </div>
              </Button>

              <Button
                onClick={() => handleOptionSelect('program')}
                variant="outline"
                className="w-full justify-start text-left h-auto bg-[#111111] hover:bg-[#1a1a1a] text-white border-[#2a2a2a] cursor-pointer p-4"
              >
                <div className="flex flex-col items-start w-full">
                  <span className="font-semibold text-white text-base">Choose from Program</span>
                  <span className="text-xs text-gray-400 mt-1.5">
                    Select a workout from an existing program
                  </span>
                </div>
              </Button>

              <Button
                onClick={() => handleOptionSelect('existing')}
                variant="outline"
                className="w-full justify-start text-left h-auto bg-[#111111] hover:bg-[#1a1a1a] text-white border-[#2a2a2a] cursor-pointer p-4"
              >
                <div className="flex flex-col items-start w-full">
                  <span className="font-semibold text-white text-base">Choose from Existing Workouts</span>
                  <span className="text-xs text-gray-400 mt-1.5">
                    Select from previously created workouts
                  </span>
                </div>
              </Button>
            </div>
          ) : (
            // Selected option view
            <div className="space-y-4">
              {/* Back button */}
              <Button
                onClick={() => setSelectedOption(null)}
                variant="ghost"
                className="text-gray-400 hover:text-white cursor-pointer p-0 h-auto"
              >
                ← Back
              </Button>

              {/* Create New Workout - This should not render here since we close the dialog */}
              {selectedOption === 'create' && (
                <div className="space-y-4">
                  <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
                    <h3 className="text-white font-semibold mb-4">Create New Workout</h3>
                    <div className="space-y-3 text-gray-400 text-sm">
                      <p>Opening workout editor...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Choose from Program */}
              {selectedOption === 'program' && (
                <div className="space-y-4">
                  <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
                    <h3 className="text-white font-semibold mb-4">Select from Program</h3>
                    <div className="space-y-3 text-gray-400 text-sm">
                      <p>Program selection interface will appear here.</p>
                      <p className="text-xs italic">(Functionality to be implemented)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Choose from Existing Workouts */}
              {selectedOption === 'existing' && (
                <div className="space-y-4">
                  <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
                    <h3 className="text-white font-semibold mb-4">Select Existing Workout</h3>
                    <div className="space-y-3 text-gray-400 text-sm">
                      <p>Existing workouts list will appear here.</p>
                      <p className="text-xs italic">(Functionality to be implemented)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Placeholder for assign action
                    console.log('Assign workout:', selectedOption)
                    handleCancel()
                  }}
                  className="bg-[#f97316] hover:bg-[#ea6820] text-white cursor-pointer"
                >
                  Assign Workout
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Workout Editor Dialog - opens when "Create New Workout" is selected */}
    <EditWorkout
      open={showWorkoutEditor}
      onOpenChange={(open) => {
        setShowWorkoutEditor(open)
        if (!open) {
          // If editor closes, optionally reopen the assign dialog
          // onOpenChange(true)
        }
      }}
      onSave={handleWorkoutSave}
      mode="create"
    />
    </>
  )
}

