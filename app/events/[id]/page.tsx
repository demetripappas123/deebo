'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { notFound } from 'next/navigation'
import AssignWorkout from '@/modules/sessions/assignworkout'
import EditWorkout from '@/modules/sessions/editworkout'
import StartSession from '@/modules/sessions/startsession'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@heroicons/react/24/solid'
import { fetchSessionById, fetchSessionWithExercises, SessionWithExercises, SessionStatus } from '@/supabase/fetches/fetchsessions'
import { deleteSession } from '@/supabase/deletions/deletesession'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { SessionType } from '@/supabase/fetches/fetchsessions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export const dynamic = 'force-dynamic'

export default function EventPage() {
  const params = useParams()
  const id = params.id as string
  const [session, setSession] = useState<SessionWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [startSessionOpen, setStartSessionOpen] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      try {
        // Fetch the session directly by ID
        const sessionWithExercises = await fetchSessionWithExercises(id)
        if (sessionWithExercises) {
          setSession(sessionWithExercises)
        } else {
          setSession(null)
        }
      } catch (error) {
        console.error('Error loading session:', error)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [id])

  // If starting session, show full-page view instead of normal page
  // This must be after all hooks are called
  if (startSessionOpen && session) {
    return (
      <StartSession
        session={session}
        onSessionComplete={async () => {
          // Reload session data
          const sessionWithExercises = await fetchSessionWithExercises(id)
          if (sessionWithExercises) {
            setSession(sessionWithExercises)
          }
          setStartSessionOpen(false)
        }}
        onCancel={() => setStartSessionOpen(false)}
      />
    )
  }

  if (loading) {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen">
        <div>Loading...</div>
      </main>
    )
  }

  if (!session) {
    return notFound()
  }

  // Format status for display
  const formatStatus = (status: SessionStatus) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Handle cancelled status
  if (session.status === 'canceled with charge' || session.status === 'canceled no charge') {
    const chargeMessage = session.status === 'canceled with charge' 
      ? 'This session has been cancelled and the client will be charged.' 
      : 'This session has been cancelled and the client will not be charged.'
    
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen">
        <h1 className="text-3xl font-bold mb-4">{session.type}</h1>

        <div className="space-y-2 text-gray-300 mb-8">
          <p>
            <span className="font-semibold text-white">Date:</span> {session.start_time ? new Date(session.start_time).toLocaleString() : 'No date'}
          </p>
          {session.start_time && session.end_time && (
            <p>
              <span className="font-semibold text-white">Duration:</span> {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)} minutes
            </p>
          )}
          <p>
            <span className="font-semibold text-white">Status:</span> <span className="capitalize text-red-400">{formatStatus(session.status)}</span>
          </p>
        </div>

        <div className="bg-[#1f1f1f] border border-red-500/50 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Session Cancelled</h2>
          <p className="text-gray-300">{chargeMessage}</p>
        </div>
      </main>
    )
  }

  // Handle completed status - show prescribed vs actual sets
  if (session.status === 'completed') {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen">
        <h1 className="text-3xl font-bold mb-4">{session.type}</h1>

        <div className="space-y-2 text-gray-300 mb-8">
          <p>
            <span className="font-semibold text-white">Date:</span> {session.start_time ? new Date(session.start_time).toLocaleString() : 'No date'}
          </p>
          {session.start_time && session.end_time && (
            <p>
              <span className="font-semibold text-white">Duration:</span> {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)} minutes
            </p>
          )}
          <p>
            <span className="font-semibold text-white">Status:</span> <span className="capitalize text-green-400">{formatStatus(session.status)}</span>
          </p>
        </div>

        {/* Display completed workout with actual sets */}
        {session && session.exercises && session.exercises.length > 0 && (
          <div className="mt-8 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Completed Workout</h2>
            <div className="space-y-6">
              {session.exercises.map((exercise, idx) => (
                <div key={exercise.id || idx} className="bg-[#111111] rounded-md p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {exercise.position + 1}. {exercise.exercise_name || 'Unknown Exercise'}
                    </h3>
                    {exercise.notes && (
                      <p className="text-sm text-gray-400">{exercise.notes}</p>
                    )}
                  </div>
                  {exercise.sets && exercise.sets.length > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-400 pb-2 border-b border-[#2a2a2a]">
                        <div>Set</div>
                        <div>Weight</div>
                        <div>Reps</div>
                        <div>RIR</div>
                        <div>RPE</div>
                        <div>Notes</div>
                      </div>
                      {exercise.sets.map((set, setIdx) => (
                        <div key={set.id || setIdx} className="grid grid-cols-6 gap-2 text-sm text-gray-300">
                          <div>{set.set_number}</div>
                          <div className={set.weight !== null ? 'text-white font-medium' : ''}>{set.weight ?? '-'}</div>
                          <div className={set.reps !== null ? 'text-white font-medium' : ''}>{set.reps ?? '-'}</div>
                          <div className={set.rir !== null ? 'text-white font-medium' : ''}>{set.rir ?? '-'}</div>
                          <div className={set.rpe !== null ? 'text-white font-medium' : ''}>{set.rpe ?? '-'}</div>
                          <div className="text-xs">{set.notes || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    )
  }

  // Handle pending status - show normal UI
  return (
    <main className="p-8 text-white bg-[#111111] min-h-screen">
      <h1 className="text-3xl font-bold mb-4">{session.type}</h1>

      <div className="space-y-2 text-gray-300">
        <p>
          <span className="font-semibold text-white">Date:</span> {session.start_time ? new Date(session.start_time).toLocaleString() : 'No date'}
        </p>
        <p>
          <span className="font-semibold text-white">Status:</span> <span className="capitalize">{formatStatus(session.status)}</span>
        </p>
      </div>

      <div className="mt-8">
        <Button
          onClick={() => {
            if (session && session.exercises && session.exercises.length > 0) {
              setEditWorkoutOpen(true)
            } else {
              setAssignWorkoutOpen(true)
            }
          }}
          className="bg-[#f97316] hover:bg-[#ea6820] text-white cursor-pointer"
        >
          {session && session.exercises && session.exercises.length > 0 ? 'Edit Workout' : 'Assign Workout'}
        </Button>
      </div>

      {/* Display assigned workout */}
      {session && session.exercises && session.exercises.length > 0 && (
        <div className="mt-8 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Assigned Workout</h2>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="p-2 text-red-500 hover:text-red-600 cursor-pointer"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-6">
            {session.exercises.map((exercise, idx) => (
              <div key={exercise.id || idx} className="bg-[#111111] rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {exercise.position + 1}. {exercise.exercise_name || 'Unknown Exercise'}
                  </h3>
                  {exercise.notes && (
                    <p className="text-sm text-gray-400">{exercise.notes}</p>
                  )}
                </div>
                {exercise.sets && exercise.sets.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-400 pb-2 border-b border-[#2a2a2a]">
                      <div>Set</div>
                      <div>Weight</div>
                      <div>Reps</div>
                      <div>RIR</div>
                      <div>RPE</div>
                      <div>Notes</div>
                    </div>
                    {exercise.sets.map((set, setIdx) => (
                      <div key={set.id || setIdx} className="grid grid-cols-6 gap-2 text-sm text-gray-300">
                        <div>{set.set_number}</div>
                        <div>{set.weight ?? '-'}</div>
                        <div>{set.reps ?? '-'}</div>
                        <div>{set.rir ?? '-'}</div>
                        <div>{set.rpe ?? '-'}</div>
                        <div className="text-xs">{set.notes || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Session button - only visible when workout is assigned */}
      {session && session.exercises && session.exercises.length > 0 && (
        <div className="mt-8">
          <Button
            onClick={() => setStartSessionOpen(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          >
            Start Session
          </Button>
        </div>
      )}

      {/* Cancel Session button - always visible at the bottom */}
      <div className="mt-8">
        <Button
          onClick={() => setCancelDialogOpen(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
        >
          Cancel Session
        </Button>
      </div>

      <AssignWorkout
        open={assignWorkoutOpen}
        onOpenChange={(open) => {
          setAssignWorkoutOpen(open)
          // Reload session data when dialog closes
          if (!open) {
            const reloadSession = async () => {
              const sessionWithExercises = await fetchSessionWithExercises(id)
              if (sessionWithExercises) {
                setSession(sessionWithExercises)
              } else {
                setSession(null)
              }
            }
            reloadSession()
          }
        }}
        sessionId={id}
        sessionType={session.type}
        clientId={session.client_id}
        prospectId={session.prospect_id}
      />

      {/* Edit Workout Dialog - opens directly when editing existing session */}
      {session && (
        <EditWorkout
          open={editWorkoutOpen}
          onOpenChange={(open) => {
            setEditWorkoutOpen(open)
            // Reload session data when dialog closes
            if (!open) {
              const reloadSession = async () => {
                const sessionWithExercises = await fetchSessionWithExercises(id)
                if (sessionWithExercises) {
                  setSession(sessionWithExercises)
                } else {
                  setSession(null)
                }
              }
              reloadSession()
            }
          }}
          sessionId={session.id}
          initialExercises={session.exercises}
          mode="edit"
          onSave={async (data) => {
            if (!session) return

            try {
              // Update the session
              await upsertSession({
                id: session.id,
                client_id: session.client_id,
                prospect_id: session.prospect_id,
                trainer_id: session.trainer_id,
                type: session.type,
                status: session.status,
                start_time: data.sessionUpdates?.start_time ?? session.start_time,
                end_time: data.sessionUpdates?.end_time ?? session.end_time,
                workout_id: data.sessionUpdates?.workout_id ?? session.workout_id,
                day_id: data.sessionUpdates?.day_id ?? session.day_id,
              })

              // Delete all existing exercises (cascade will handle sets)
              const { error: deleteError } = await supabase
                .from('session_exercises')
                .delete()
                .eq('session_id', session.id)

              if (deleteError) {
                throw deleteError
              }

              // Create new exercises and sets
              for (let i = 0; i < data.exercises.length; i++) {
                const exercise = data.exercises[i]
                
                const sessionExercise = await upsertSessionExercise({
                  session_id: session.id,
                  exercise_id: exercise.exercise_id,
                  position: i,
                  notes: exercise.notes || null,
                })

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
            } catch (error) {
              console.error('Error saving workout:', error)
              alert('Error saving workout. Please try again.')
              throw error
            }
          }}
        />
      )}

      {/* Delete Workout Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1f1f1f] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Unassign Workout</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to unassign this workout? This will delete the session and all associated exercises and sets.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="cursor-pointer bg-[#333333] text-white border-[#2a2a2a] hover:bg-[#404040] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!session) return
                try {
                  await deleteSession(session.id)
                  setSession(null)
                  setDeleteDialogOpen(false)
                  alert('Workout unassigned successfully')
                } catch (error) {
                  console.error('Error deleting workout:', error)
                  alert('Error unassigning workout. Please try again.')
                }
              }}
              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
            >
              Unassign Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Session Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-[#1f1f1f] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Session</DialogTitle>
            <DialogDescription className="text-gray-300">
              How would you like to cancel this session?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              type="button"
              onClick={async () => {
                try {
                  if (!session) return
                  // Update session status
                  await upsertSession({
                    id: session.id,
                    type: session.type,
                    status: 'canceled with charge',
                    client_id: session.client_id,
                    prospect_id: session.prospect_id,
                    trainer_id: session.trainer_id,
                    start_time: session.start_time,
                    end_time: session.end_time,
                  })
                  
                  // Reload session
                  const updatedSession = await fetchSessionWithExercises(id)
                  if (updatedSession) setSession(updatedSession)
                  
                  setCancelDialogOpen(false)
                  alert('Session canceled with charge')
                } catch (error) {
                  console.error('Error canceling session:', error)
                  alert('Error canceling session. Please try again.')
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Cancel with Charge
            </Button>
            <Button
              type="button"
              onClick={async () => {
                try {
                  if (!session) return
                  // Update session status
                  await upsertSession({
                    id: session.id,
                    type: session.type,
                    status: 'canceled no charge',
                    client_id: session.client_id,
                    prospect_id: session.prospect_id,
                    trainer_id: session.trainer_id,
                    start_time: session.start_time,
                    end_time: session.end_time,
                  })
                  
                  // Reload session
                  const updatedSession = await fetchSessionWithExercises(id)
                  if (updatedSession) setSession(updatedSession)
                  
                  setCancelDialogOpen(false)
                  alert('Session canceled without charge')
                } catch (error) {
                  console.error('Error canceling session:', error)
                  alert('Error canceling session. Please try again.')
                }
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
            >
              Cancel without Charge
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="cursor-pointer bg-[#333333] text-white border-[#2a2a2a] hover:bg-[#404040] hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}
