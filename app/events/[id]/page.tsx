'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { notFound } from 'next/navigation'
import AssignWorkout from '@/modules/sessions/assignworkout'
import EditWorkout from '@/modules/sessions/editworkout'
import StartSession from '@/modules/sessions/startsession'
import Questionnaire from '@/modules/sessions/questionnaire'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@heroicons/react/24/solid'
import { fetchSessionById, fetchSessionWithExercises, SessionWithExercises } from '@/supabase/fetches/fetchsessions'
import { deleteSession } from '@/supabase/deletions/deletesession'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { SessionType } from '@/supabase/fetches/fetchsessions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getServerTime } from '@/supabase/utils/getServerTime'
import { fetchPersonById } from '@/supabase/fetches/fetchpeople'
import { upsertClient } from '@/supabase/upserts/upsertperson'
import { UserCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [session, setSession] = useState<SessionWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [startSessionOpen, setStartSessionOpen] = useState(false)
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false)
  const [converting, setConverting] = useState(false)

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
        onSessionStart={async () => {
          // Set started_at when session actually starts
          // Use server time to avoid client clock issues
          if (!session.started_at) {
            const currentTime = await getServerTime()
            await upsertSession({
              id: session.id,
              type: session.type,
              person_id: session.person_id,
              trainer_id: session.trainer_id,
              start_time: session.start_time, // Keep scheduled time
              started_at: currentTime, // Set actual start time from server
              workout_id: session.workout_id,
              converted: session.converted,
              status: session.status || 'pending', // Keep existing status or default to pending
            })
            // Reload session data
            const sessionWithExercises = await fetchSessionWithExercises(id)
            if (sessionWithExercises) {
              setSession(sessionWithExercises)
            }
          }
        }}
        onSessionComplete={async () => {
          // Reload session data
          const sessionWithExercises = await fetchSessionWithExercises(id)
          if (sessionWithExercises) {
            setSession(sessionWithExercises)
          }
          setStartSessionOpen(false)
          
          // If this is a prospect session (KO/SGA) and not converted, redirect to conversion page
          const isProspectSession = sessionWithExercises.type === 'KO' || sessionWithExercises.type === 'SGA' || sessionWithExercises.type === 'KOFU'
          if (isProspectSession && !sessionWithExercises.converted && sessionWithExercises.person_id) {
            router.push(`/conversion/${sessionWithExercises.person_id}`)
          }
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

  // Calculate duration in minutes from started_at to end_time
  const calculateDuration = (startedAt: string | null, endTime: string | null): number | null => {
    if (!startedAt || !endTime) return null
    
    const start = new Date(startedAt)
    const end = new Date(endTime)
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    
    // Calculate difference in milliseconds, then convert to minutes
    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.round(diffMs / (1000 * 60))
    
    // Return null if negative (shouldn't happen, but safety check)
    return diffMinutes >= 0 ? diffMinutes : null
  }

  // Check if this is a prospect session (not a client session)
  const isProspectSession = session.type !== 'Client Session'

  // Check if session is cancelled
  const isCancelled = session.status === 'canceled_with_charge' || session.status === 'canceled_no_charge'
  const isCompleted = session.status === 'completed' || session.end_time

  // Handle completed or cancelled status - show prescribed vs actual sets
  if (isCompleted || isCancelled) {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold">{session.type}</h1>
          {isCancelled && (
            <span className={`px-3 py-1 rounded-md text-sm font-semibold ${
              session.status === 'canceled_with_charge'
                ? 'bg-red-600/20 text-red-400 border border-red-600/50' 
                : 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
            }`}>
              {session.status === 'canceled_with_charge' ? 'Cancelled (With Charge)' : 'Cancelled (No Charge)'}
            </span>
          )}
        </div>

        <div className="space-y-2 text-gray-300 mb-8">
          <p>
            <span className="font-semibold text-white">Scheduled:</span> {session.start_time ? new Date(session.start_time).toLocaleString() : 'No date'}
          </p>
          {session.started_at && (
            <p>
              <span className="font-semibold text-white">Started:</span> {new Date(session.started_at).toLocaleString()}
            </p>
          )}
          {(() => {
            const duration = calculateDuration(session.started_at, session.end_time)
            return duration !== null ? (
              <p>
                <span className="font-semibold text-white">Duration:</span> {duration} minutes
              </p>
            ) : null
          })()}
          <p>
            <span className="font-semibold text-white">Status:</span>{' '}
            {isCancelled ? (
              <span className={`capitalize ${
                session.status === 'canceled_with_charge' ? 'text-red-400' : 'text-orange-400'
              }`}>
                {session.status === 'canceled_with_charge' ? 'Cancelled (With Charge)' : 'Cancelled (No Charge)'}
              </span>
            ) : (
              <span className="capitalize text-green-400">Completed</span>
            )}
          </p>
        </div>

        {/* Convert to Client button - show if completed and not converted */}
        {session.status === 'completed' && !session.converted && session.person_id && (
          <div className="mb-8">
            <Button
              onClick={async () => {
                if (!session.person_id) return
                
                setConverting(true)
                try {
                  // Fetch person data
                  const person = await fetchPersonById(session.person_id)
                  if (!person) {
                    alert('Person not found')
                    return
                  }

                  // Convert prospect to client
                  await upsertClient({
                    id: person.id,
                    name: person.name,
                    number: person.number,
                    notes: person.notes,
                    program_id: person.program_id,
                    converted_at: new Date().toISOString(),
                  })

                  // Update session to mark as converted
                  await upsertSession({
                    id: session.id,
                    type: session.type,
                    person_id: session.person_id,
                    trainer_id: session.trainer_id,
                    start_time: session.start_time,
                    started_at: session.started_at,
                    end_time: session.end_time,
                    workout_id: session.workout_id,
                    converted: true,
                    status: session.status,
                  })

                  // Reload session data
                  const sessionWithExercises = await fetchSessionWithExercises(session.id)
                  if (sessionWithExercises) {
                    setSession(sessionWithExercises)
                  }

                  alert('Prospect converted to client successfully!')
                } catch (error) {
                  console.error('Error converting prospect to client:', error)
                  alert('Error converting prospect to client. Please try again.')
                } finally {
                  setConverting(false)
                }
              }}
              disabled={converting}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {converting ? 'Converting...' : 'Convert to Client'}
            </Button>
          </div>
        )}

        {/* Display completed workout with actual sets */}
        {session.exercises && session.exercises.length > 0 ? (
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
        ) : (
          <div className="mt-8 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Completed Workout</h2>
            <p className="text-gray-400">No workout data available for this session.</p>
          </div>
        )}
      </main>
    )
  }

  // Handle pending status - show normal UI
  return (
    <main className="p-8 text-white bg-[#111111] min-h-screen">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">{session.type}</h1>
        {session.cancelled && (
          <span className={`px-3 py-1 rounded-md text-sm font-semibold ${
            session.cancelled_with_charge 
              ? 'bg-red-600/20 text-red-400 border border-red-600/50' 
              : 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
          }`}>
            {session.cancelled_with_charge ? 'Cancelled (With Charge)' : 'Cancelled (No Charge)'}
          </span>
        )}
      </div>

      <div className="space-y-2 text-gray-300">
        <p>
          <span className="font-semibold text-white">Scheduled:</span> {session.start_time ? new Date(session.start_time).toLocaleString() : 'No date'}
        </p>
        <p>
          <span className="font-semibold text-white">Status:</span>{' '}
          {isCancelled ? (
            <span className={`capitalize ${
              session.status === 'canceled_with_charge' ? 'text-red-400' : 'text-orange-400'
            }`}>
              {session.status === 'canceled_with_charge' ? 'Cancelled (With Charge)' : 'Cancelled (No Charge)'}
            </span>
          ) : (
            <span className="capitalize text-yellow-400">Pending</span>
          )}
        </p>
      </div>

      {!isCancelled && (
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
      )}

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

      {/* Questionnaire - only for prospect sessions, must be completed before starting workout */}
      {isProspectSession && session.person_id && (
        <Questionnaire 
          sessionId={session.id} 
          prospectId={session.person_id}
          onCompletionChange={setQuestionnaireCompleted}
        />
      )}

      {/* Action buttons at the bottom - only show if not cancelled */}
      {!isCancelled && (
        <div className="mt-8 flex flex-col gap-4">
          {/* Start Session button */}
          {/* For prospect sessions: only require questionnaire to be completed (workout not required) */}
          {/* For client sessions: require workout to be assigned */}
          {((isProspectSession && questionnaireCompleted) || 
            (!isProspectSession && session && session.exercises && session.exercises.length > 0)) && (
            <Button
              onClick={() => setStartSessionOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              Start Session
            </Button>
          )}
          {/* Cancel Session button - only visible if not already cancelled */}
          <Button
            onClick={() => setCancelDialogOpen(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Cancel Session
          </Button>
        </div>
      )}

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
        personId={session.person_id}
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
              if (!session.workout_id) {
                throw new Error('Session has no workout assigned')
              }

              // Update the session
              await upsertSession({
                id: session.id,
                person_id: session.person_id,
                trainer_id: session.trainer_id,
                type: session.type,
                start_time: data.sessionUpdates?.start_time ?? session.start_time,
                started_at: session.started_at,
                end_time: data.sessionUpdates?.end_time ?? session.end_time,
                workout_id: session.workout_id,
                converted: session.converted,
              })

              // Delete all existing exercises for this workout (cascade will handle sets)
              const { error: deleteError } = await supabase
                .from('session_exercises')
                .delete()
                .eq('workout_id', session.workout_id)

              if (deleteError) {
                throw deleteError
              }

              // Create new exercises and sets
              for (let i = 0; i < data.exercises.length; i++) {
                const exercise = data.exercises[i]
                
                const sessionExercise = await upsertSessionExercise({
                  workout_id: session.workout_id,
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
                  // Mark session as cancelled with charge (update status)
                  await upsertSession({
                    id: session.id,
                    type: session.type,
                    person_id: session.person_id,
                    trainer_id: session.trainer_id,
                    start_time: session.start_time,
                    started_at: session.started_at,
                    end_time: session.end_time,
                    workout_id: session.workout_id,
                    converted: session.converted,
                    status: 'canceled_with_charge',
                  })
                  
                  setCancelDialogOpen(false)
                  alert('Session canceled with charge')
                  // Reload session data
                  const sessionWithExercises = await fetchSessionWithExercises(session.id)
                  if (sessionWithExercises) {
                    setSession(sessionWithExercises)
                  }
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
                  // Mark session as cancelled without charge (update status)
                  await upsertSession({
                    id: session.id,
                    type: session.type,
                    person_id: session.person_id,
                    trainer_id: session.trainer_id,
                    start_time: session.start_time,
                    started_at: session.started_at,
                    end_time: session.end_time,
                    workout_id: session.workout_id,
                    converted: session.converted,
                    status: 'canceled_no_charge',
                  })
                  
                  setCancelDialogOpen(false)
                  alert('Session canceled without charge')
                  // Reload session data
                  const sessionWithExercises = await fetchSessionWithExercises(session.id)
                  if (sessionWithExercises) {
                    setSession(sessionWithExercises)
                  }
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
