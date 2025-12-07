'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { Client } from '@/supabase/fetches/fetchclients'
import { fetchClientNutritionEntries, NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { updateNutritionEntries } from '@/supabase/upserts/upsertnutrition'
import { fetchClientNutritionGoals, NutritionGoal } from '@/supabase/fetches/fetchnutritiongoals'
import { fetchClientSessions, fetchSessionWithExercises, SessionWithExercises } from '@/supabase/fetches/fetchsessions'
import EditNutrition from '@/modules/clients/editnutrition'
import NutritionChart from '@/modules/clients/nutritionchart'
import CompactNutritionGoals from '@/modules/clients/compactnutritiongoals'
import WorkoutVolumeChart from '@/modules/clients/workoutvolumechart'
import RPERIRChart from '@/modules/clients/rperirchart'
import WeightProgressionChart from '@/modules/clients/weightprogressionchart'
import EditWorkout from '@/modules/sessions/editworkout'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { Utensils, Dumbbell, Pencil, Activity } from 'lucide-react'

export default function ClientPage() {
  const params = useParams()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([])
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal[]>([])
  const [sessions, setSessions] = useState<SessionWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)
  const [activeTab, setActiveTab] = useState<'nutrition' | 'sessions' | 'progress'>('progress')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)

  useEffect(() => {
    const loadClient = async () => {
      const clientId = params.id
      if (!clientId) return setLoading(false)

      setLoading(true)
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single()

        if (clientError) {
          console.error('Error loading client:', clientError)
          setClient(null)
        } else {
          setClient(clientData)
          
          // Fetch nutrition entries for this client
          try {
            const nutritionData = await fetchClientNutritionEntries(clientData.id)
            console.log('Fetched nutrition entries:', {
              count: nutritionData?.length || 0,
              data: nutritionData,
            })
            setNutritionEntries(nutritionData || [])
          } catch (err) {
            console.error('Error loading nutrition entries:', err)
            setNutritionEntries([])
          }

          // Fetch nutrition goals for this client
          try {
            const goalsData = await fetchClientNutritionGoals(clientData.id)
            setNutritionGoals(goalsData || [])
          } catch (err) {
            console.error('Error loading nutrition goals:', err)
            setNutritionGoals([])
          }

          // Fetch sessions for this client
          try {
            const clientSessions = await fetchClientSessions(clientData.id)
            
            if (clientSessions.length === 0) {
              setSessions([])
            } else {
              // Fetch full session data with exercises for each session
              const sessionsWithExercises = await Promise.all(
                clientSessions.map(async (session) => {
                  return await fetchSessionWithExercises(session.id)
                })
              )
              // Filter out null values and sort by date (most recent first)
              const validSessions = sessionsWithExercises
                .filter((s): s is SessionWithExercises => s !== null)
                .sort((a, b) => {
                  const dateA = a.start_time ? new Date(a.start_time).getTime() : 0
                  const dateB = b.start_time ? new Date(b.start_time).getTime() : 0
                  return dateB - dateA
                })
              setSessions(validSessions)
            }
          } catch (err) {
            console.error('Error loading sessions:', err)
            setSessions([])
          }
        }
      } catch (err) {
        console.error('Unexpected error loading client:', err)
        setClient(null)
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [params.id])

  const handleSaveNutrition = async (
    entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!client) return

    try {
      const updated = await updateNutritionEntries(client.id, entries)
      if (updated) {
        setNutritionEntries(updated)
        setIsEditingNutrition(false)
      }
    } catch (err) {
      console.error('Failed to save nutrition entries:', err)
      throw err
    }
  }

  if (loading) return <p className="text-gray-300">Loading client...</p>
  if (!client) return <p className="text-gray-300">Client not found.</p>

  return (
    <div className="p-6 space-y-4 bg-[#111111] min-h-screen text-white">
      <button
        onClick={() => router.back()}
        className="px-3 py-1 bg-[#333333] rounded-md hover:bg-[#404040] cursor-pointer"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-4">{client.name}</h1>

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
              clientId={client.id}
              initialGoals={nutritionGoals}
              onUpdate={async () => {
                if (client) {
                  try {
                    const goalsData = await fetchClientNutritionGoals(client.id)
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
                clientId={client.id}
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
            <p className="text-gray-400">No sessions found for this client.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {session.type}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {session.start_time
                          ? new Date(session.start_time).toLocaleString()
                          : 'No date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.end_time && (
                        <p className="text-sm text-gray-400">
                          Duration: {Math.round(
                            (new Date(session.end_time).getTime() -
                              new Date(session.start_time!).getTime()) /
                              60000
                          )}{' '}
                          minutes
                        </p>
                      )}
                      <button
                        onClick={() => setEditingSessionId(session.id)}
                        className="p-2 text-orange-500 hover:text-orange-600 cursor-pointer"
                        title="Edit session"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {session.exercises && session.exercises.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {session.exercises.map((exercise, idx) => (
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
                    <p className="text-gray-400 text-sm mt-4">No exercises recorded for this session.</p>
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
          <WorkoutVolumeChart sessions={sessions} />
          <RPERIRChart sessions={sessions} />
          <WeightProgressionChart sessions={sessions} />
        </div>
      )}

      {/* Edit Session Dialog */}
      {editingSessionId && (() => {
        const sessionToEdit = sessions.find(s => s.id === editingSessionId)
        return sessionToEdit ? (
          <EditWorkout
            open={!!editingSessionId}
            onOpenChange={(open) => {
              if (!open) setEditingSessionId(null)
            }}
            sessionId={sessionToEdit.id}
            initialExercises={sessionToEdit.exercises}
            mode="edit"
            onSave={async (data) => {
              try {
                // Update session
                await upsertSession({
                  id: sessionToEdit.id,
                  type: sessionToEdit.type,
                  status: sessionToEdit.status,
                  client_id: sessionToEdit.client_id,
                  prospect_id: sessionToEdit.prospect_id,
                  trainer_id: sessionToEdit.trainer_id,
                  start_time: data.sessionUpdates?.start_time ?? sessionToEdit.start_time,
                  end_time: data.sessionUpdates?.end_time ?? sessionToEdit.end_time,
                  workout_id: data.sessionUpdates?.workout_id ?? sessionToEdit.workout_id,
                  day_id: data.sessionUpdates?.day_id ?? sessionToEdit.day_id,
                })

                // Delete all existing exercises (cascade will handle sets)
                const { error: deleteError } = await supabase
                  .from('session_exercises')
                  .delete()
                  .eq('session_id', sessionToEdit.id)

                if (deleteError) throw deleteError

                // Create new exercises and sets
                for (let i = 0; i < data.exercises.length; i++) {
                  const exercise = data.exercises[i]
                  
                  const sessionExercise = await upsertSessionExercise({
                    session_id: sessionToEdit.id,
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

                // Reload sessions
                const clientSessions = await fetchClientSessions(client!.id)
                const sessionsWithExercises = await Promise.all(
                  clientSessions.map(async (s) => await fetchSessionWithExercises(s.id))
                )
                const validSessions = sessionsWithExercises
                  .filter((s): s is SessionWithExercises => s !== null)
                  .sort((a, b) => {
                    const dateA = a.start_time ? new Date(a.start_time).getTime() : 0
                    const dateB = b.start_time ? new Date(b.start_time).getTime() : 0
                    return dateB - dateA
                  })
                setSessions(validSessions)
                setEditingSessionId(null)
              } catch (error) {
                console.error('Error saving session:', error)
                alert('Error saving session. Please try again.')
                throw error
              }
            }}
          />
        ) : null
      })()}
    </div>
  )
}

