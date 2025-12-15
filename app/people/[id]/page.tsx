'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { Person } from '@/supabase/fetches/fetchpeople'
import { fetchClientNutritionEntries, NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { updateNutritionEntries } from '@/supabase/upserts/upsertnutrition'
import { fetchClientNutritionGoals, NutritionGoal } from '@/supabase/fetches/fetchnutritiongoals'
import { fetchClientSessions, fetchSessionWithExercises, SessionWithExercises, Session, fetchSessionByWorkoutId } from '@/supabase/fetches/fetchsessions'
import { fetchPersonWorkouts, Workout } from '@/supabase/fetches/fetchworkouts'
import { fetchWorkoutExercises } from '@/supabase/fetches/fetchsessions'
import { upsertWorkout } from '@/supabase/upserts/upsertworkout'
import { Plus } from 'lucide-react'
import EditNutrition from '@/modules/clients/editnutrition'
import NutritionChart from '@/modules/clients/nutritionchart'
import CompactNutritionGoals from '@/modules/clients/compactnutritiongoals'
import WorkoutVolumeChart from '@/modules/clients/workoutvolumechart'
import RPERIRChart from '@/modules/clients/rperirchart'
import WeightProgressionChart from '@/modules/clients/weightprogressionchart'
import EditWorkout from '@/modules/sessions/editworkout'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { upsertClient } from '@/supabase/upserts/upsertperson'
import { Utensils, Dumbbell, Pencil, Activity, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'


export default function PersonPage() {
  const params = useParams()
  const router = useRouter()

  const [person, setPerson] = useState<Person | null>(null)
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([])
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal[]>([])
  const [sessions, setSessions] = useState<Session[]>([]) // Changed to Session[] - no exercises needed
  const [workouts, setWorkouts] = useState<Array<Workout & { session?: Session | null; exercises?: any[] }>>([])
  const [loading, setLoading] = useState(true)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)
  const [activeTab, setActiveTab] = useState<'nutrition' | 'sessions' | 'workouts' | 'progress'>('progress')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)

  const isClient = person?.converted_at !== null && person?.converted_at !== undefined
  const isProspect = !isClient

  useEffect(() => {
    const loadPerson = async () => {
      const personId = params.id
      if (!personId) return setLoading(false)

      setLoading(true)
      try {
        const { data: personData, error: personError } = await supabase
          .from('people')
          .select('*')
          .eq('id', personId)
          .single()

        if (personError) {
          console.error('Error loading person:', personError)
          setPerson(null)
        } else {
          setPerson(personData)
          
          // Only fetch client-specific data if this is a client
          if (personData.converted_at !== null) {
            // Fetch nutrition entries for this client
            try {
              const nutritionData = await fetchClientNutritionEntries(personData.id)
              setNutritionEntries(nutritionData || [])
            } catch (err) {
              console.error('Error loading nutrition entries:', err)
              setNutritionEntries([])
            }

            // Fetch nutrition goals for this client
            try {
              const goalsData = await fetchClientNutritionGoals(personData.id)
              setNutritionGoals(goalsData || [])
            } catch (err) {
              console.error('Error loading nutrition goals:', err)
              setNutritionGoals([])
            }
          }

          // Fetch sessions for this person (both clients and prospects have sessions) - metadata only
          try {
            const personSessions = await fetchClientSessions(personData.id)
            setSessions(personSessions.sort((a, b) => {
              const dateA = a.start_time ? new Date(a.start_time).getTime() : 0
              const dateB = b.start_time ? new Date(b.start_time).getTime() : 0
              return dateB - dateA
            }))
          } catch (err) {
            console.error('Error loading sessions:', err)
            setSessions([])
          }

          // Fetch workouts for this person
          try {
            const personWorkouts = await fetchPersonWorkouts(personData.id)
            // For each workout, fetch associated session and exercises with sets
            const workoutsWithData = await Promise.all(
              personWorkouts.map(async (workout) => {
                const session = await fetchSessionByWorkoutId(workout.id)
                const exercises = await fetchWorkoutExercises(workout.id)
                // Fetch sets for each exercise
                const exercisesWithSets = await Promise.all(
                  exercises.map(async (exercise) => {
                    const { data: sets, error: setsError } = await supabase
                      .from('exercise_sets')
                      .select('*')
                      .eq('session_exercise_id', exercise.id)
                      .order('set_number', { ascending: true })
                    
                    if (setsError) {
                      console.error('Error fetching exercise sets:', setsError)
                      return { ...exercise, sets: [] }
                    }
                    
                    return { ...exercise, sets: sets || [] }
                  })
                )
                return {
                  ...workout,
                  session: session || null,
                  exercises: exercisesWithSets || [],
                }
              })
            )
            setWorkouts(workoutsWithData)
          } catch (err) {
            console.error('Error loading workouts:', err)
            setWorkouts([])
          }
        }
      } catch (err) {
        console.error('Unexpected error loading person:', err)
        setPerson(null)
      } finally {
        setLoading(false)
      }
    }

    loadPerson()
  }, [params.id])

  const handleConvertToClient = () => {
    if (!person) return
    // Redirect to conversion page
    router.push(`/conversion/${person.id}`)
  }

  const handleSaveNutrition = async (
    entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!person || !isClient) return

    try {
      const updated = await updateNutritionEntries(person.id, entries)
      if (updated) {
        setNutritionEntries(updated)
        setIsEditingNutrition(false)
      }
    } catch (err) {
      console.error('Failed to save nutrition entries:', err)
      throw err
    }
  }

  if (loading) return <p className="text-gray-300">Loading...</p>
  if (!person) return <p className="text-gray-300">Person not found.</p>

  // Prospect UI (simple)
  if (isProspect) {
    return (
      <div className="p-6 space-y-4 bg-[#111111] min-h-screen text-white">
        <button
          onClick={() => router.back()}
          className="px-3 py-1 bg-[#333333] rounded-md hover:bg-[#404040] cursor-pointer"
        >
          ← Back
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-4">{person.name}</h1>
          <Button
            onClick={handleConvertToClient}
            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer flex items-center gap-2"
          >
            <UserCheck className="h-5 w-5" />
            Convert to Client
          </Button>
        </div>

        <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
          <p className="text-gray-300 mb-2">
            <span className="font-semibold text-white">Number:</span> {person.number || 'N/A'}
          </p>
          {person.notes && (
            <p className="text-gray-300">
              <span className="font-semibold text-white">Notes:</span> {person.notes}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Client UI (full featured)
  return (
    <div className="p-6 space-y-4 bg-[#111111] min-h-screen text-white">
      <button
        onClick={() => router.back()}
        className="px-3 py-1 bg-[#333333] rounded-md hover:bg-[#404040] cursor-pointer"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-4">{person.name}</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'progress'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          } cursor-pointer`}
        >
          <Activity className="h-5 w-5" />
          Progress
        </button>
        <button
          onClick={() => setActiveTab('nutrition')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'nutrition'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          } cursor-pointer`}
        >
          <Utensils className="h-5 w-5" />
          Nutrition
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          } cursor-pointer`}
        >
          <Dumbbell className="h-5 w-5" />
          Session History
        </button>
        <button
          onClick={() => setActiveTab('workouts')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'workouts'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          } cursor-pointer`}
        >
          <Activity className="h-5 w-5" />
          Workout History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'nutrition' && (
        <>
          {/* Nutrition Goals */}
          <div className="p-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Nutrition Goals</h2>
            </div>
            <CompactNutritionGoals
              clientId={person.id}
              initialGoals={nutritionGoals}
              onUpdate={async () => {
                if (person) {
                  try {
                    const goalsData = await fetchClientNutritionGoals(person.id)
                    setNutritionGoals(goalsData || [])
                  } catch (err) {
                    console.error('Error refreshing nutrition goals:', err)
                  }
                }
              }}
            />
          </div>

          <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-white">Nutrition</h2>
              {!isEditingNutrition && (
                <button
                  onClick={() => setIsEditingNutrition(true)}
                  className="px-3 py-1 bg-orange-500 hover:bg-orange-600 rounded-md cursor-pointer text-white text-sm"
                >
                  Edit Nutrition Information
                </button>
              )}
            </div>

            {isEditingNutrition ? (
              <EditNutrition
                clientId={person.id}
                initialEntries={nutritionEntries}
                onSave={handleSaveNutrition}
                onCancel={() => setIsEditingNutrition(false)}
              />
            ) : (
              <NutritionChart entries={nutritionEntries} goals={nutritionGoals} />
            )}
          </div>
        </>
      )}

      {activeTab === 'sessions' && (
        <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
          <h2 className="text-lg font-semibold text-white mb-4">
            Session History {sessions.length > 0 && `(${sessions.length} sessions)`}
          </h2>
          {sessions.length === 0 ? (
            <p className="text-gray-400">No sessions found.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {session.type}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p>
                          <span className="font-semibold text-white">Scheduled:</span>{' '}
                          {session.start_time
                            ? new Date(session.start_time).toLocaleString()
                            : 'No date'}
                        </p>
                        {session.started_at && (
                          <p>
                            <span className="font-semibold text-white">Started:</span>{' '}
                            {new Date(session.started_at).toLocaleString()}
                          </p>
                        )}
                        {session.end_time && (
                          <p>
                            <span className="font-semibold text-white">Ended:</span>{' '}
                            {new Date(session.end_time).toLocaleString()}
                          </p>
                        )}
                        {session.started_at && session.end_time && (() => {
                          const startTime = new Date(session.started_at).getTime()
                          const endTime = new Date(session.end_time).getTime()
                          const durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
                          return (
                            <p>
                              <span className="font-semibold text-white">Duration:</span> {durationMinutes} minutes
                            </p>
                          )
                        })()}
                        {session.workout_id && (
                          <p className="text-xs text-orange-400 mt-2">
                            ✓ Workout assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Workout History {workouts.length > 0 && `(${workouts.length} workouts)`}
            </h2>
            <Button
              onClick={() => setEditingWorkoutId('new')}
              className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Workout
            </Button>
          </div>
          {workouts.length === 0 ? (
            <p className="text-gray-400">No workouts found.</p>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Workout
                        </h3>
                        {workout.session && (
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-600/50">
                            From Session: {workout.session.type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        <span className="font-semibold text-white">Date:</span>{' '}
                        {new Date(workout.created_at).toLocaleString()}
                      </p>
                      {workout.session && (
                        <p className="text-sm text-gray-400 mt-1">
                          <span className="font-semibold text-white">Session Date:</span>{' '}
                          {workout.session.start_time
                            ? new Date(workout.session.start_time).toLocaleString()
                            : 'N/A'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingWorkoutId(workout.id)}
                      className="p-2 text-orange-500 hover:text-orange-600 cursor-pointer"
                      title="Edit workout"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  </div>

                  {workout.exercises && workout.exercises.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {workout.exercises.map((exercise, idx) => (
                        <div
                          key={exercise.id || idx}
                          className="bg-[#1a1a1a] rounded-md p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-md font-medium text-white">
                              {exercise.position + 1}. {exercise.exercise_name || 'Unknown Exercise'}
                            </h4>
                            {exercise.notes && (
                              <p className="text-xs text-gray-400">{exercise.notes}</p>
                            )}
                          </div>
                          {exercise.sets && exercise.sets.length > 0 && (
                            <div className="space-y-1">
                              <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-400 pb-1 border-b border-[#2a2a2a]">
                                <div>Set</div>
                                <div>Weight</div>
                                <div>Reps</div>
                                <div>RIR</div>
                                <div>RPE</div>
                                <div>Notes</div>
                              </div>
                              {exercise.sets.map((set, setIdx) => (
                                <div
                                  key={set.id || setIdx}
                                  className="grid grid-cols-6 gap-2 text-xs text-gray-300"
                                >
                                  <div>{set.set_number}</div>
                                  <div>{set.weight ?? '-'}</div>
                                  <div>{set.reps ?? '-'}</div>
                                  <div>{set.rir ?? '-'}</div>
                                  <div>{set.rpe ?? '-'}</div>
                                  <div className="text-xs truncate">{set.notes || '-'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-4">No exercises recorded for this workout.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md space-y-6">
          <h2 className="text-lg font-semibold text-white mb-4">Progress</h2>
          {/* Convert workouts to SessionWithExercises format for charts - only workouts with sessions */}
          <WorkoutVolumeChart sessions={workouts
            .filter(w => w.session)
            .map(w => ({
              ...w.session!,
              exercises: w.exercises,
            })) as SessionWithExercises[]} />
          <RPERIRChart sessions={workouts
            .filter(w => w.session)
            .map(w => ({
              ...w.session!,
              exercises: w.exercises,
            })) as SessionWithExercises[]} />
          <WeightProgressionChart sessions={workouts
            .filter(w => w.session)
            .map(w => ({
              ...w.session!,
              exercises: w.exercises,
            })) as SessionWithExercises[]} />
        </div>
      )}

      {/* Edit Workout Dialog */}
      {editingWorkoutId && (() => {
        const workoutToEdit = editingWorkoutId === 'new' 
          ? null 
          : workouts.find(w => w.id === editingWorkoutId)
        
        return (
          <EditWorkout
            open={!!editingWorkoutId}
            onOpenChange={(open) => {
              if (!open) setEditingWorkoutId(null)
            }}
            sessionId={workoutToEdit?.session?.id}
            initialExercises={workoutToEdit?.exercises}
            mode={editingWorkoutId === 'new' ? 'create' : 'edit'}
            onSave={async (data) => {
              try {
                if (!person) {
                  throw new Error('Person not found')
                }

                let workoutId: string

                if (editingWorkoutId === 'new') {
                  // Create new workout
                  const newWorkout = await upsertWorkout({
                    person_id: person.id,
                    day_id: data.sessionUpdates?.day_id ?? null,
                  })
                  workoutId = newWorkout.id
                } else {
                  // Update existing workout
                  if (!workoutToEdit) {
                    throw new Error('Workout not found')
                  }
                  workoutId = workoutToEdit.id
                }

                // Delete all existing exercises for this workout (cascade will handle sets)
                const { error: deleteError } = await supabase
                  .from('session_exercises')
                  .delete()
                  .eq('workout_id', workoutId)

                if (deleteError) throw deleteError

                // Create new exercises and sets (using workout_id)
                // Use array index as position to ensure 0-indexed positions
                for (let i = 0; i < data.exercises.length; i++) {
                  const exercise = data.exercises[i]
                  
                  const sessionExercise = await upsertSessionExercise({
                    workout_id: workoutId,
                    exercise_id: exercise.exercise_id,
                    position: i, // Always use array index to ensure positions start at 0
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

                // Reload workouts
                const personWorkouts = await fetchPersonWorkouts(person.id)
                const workoutsWithData = await Promise.all(
                  personWorkouts.map(async (workout) => {
                    const session = await fetchSessionByWorkoutId(workout.id)
                    const exercises = await fetchWorkoutExercises(workout.id)
                    const exercisesWithSets = await Promise.all(
                      exercises.map(async (exercise) => {
                        const { data: sets, error: setsError } = await supabase
                          .from('exercise_sets')
                          .select('*')
                          .eq('session_exercise_id', exercise.id)
                          .order('set_number', { ascending: true })
                        
                        if (setsError) {
                          console.error('Error fetching exercise sets:', setsError)
                          return { ...exercise, sets: [] }
                        }
                        
                        return { ...exercise, sets: sets || [] }
                      })
                    )
                    return {
                      ...workout,
                      session: session || null,
                      exercises: exercisesWithSets || [],
                    }
                  })
                )
                setWorkouts(workoutsWithData)
                setEditingWorkoutId(null)
              } catch (error) {
                console.error('Error saving workout:', error)
                alert('Error saving workout. Please try again.')
                throw error
              }
            }}
          />
        )
      })()}
    </div>
  )
}

