'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { Person } from '@/supabase/fetches/fetchpeople'
import { fetchClientNutritionEntries, NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { updateNutritionEntries } from '@/supabase/upserts/upsertnutrition'
import { fetchClientNutritionGoals, NutritionGoal } from '@/supabase/fetches/fetchnutritiongoals'
import { fetchClientSessions, fetchSessionWithExercises, SessionWithExercises, Session } from '@/supabase/fetches/fetchsessions'
import { fetchPersonWorkoutsWithData, WorkoutWithData } from '@/supabase/fetches/fetchpersonworkoutswithdata'
import { upsertWorkout } from '@/supabase/upserts/upsertworkout'
import { Plus } from 'lucide-react'
import EditNutrition from '@/modules/clients/editnutrition'
import NutritionChart from '@/modules/clients/nutritionchart'
import CompactNutritionGoals from '@/modules/clients/compactnutritiongoals'
import WorkoutVolumeChart from '@/modules/clients/workoutvolumechart'
import RPERIRChart from '@/modules/clients/rperirchart'
import WeightProgressionChart from '@/modules/clients/weightprogressionchart'
import Packages from '@/modules/clients/packages'
import Payments from '@/modules/clients/payments'
import Contracts from '@/modules/clients/contracts'
import EditWorkout from '@/modules/sessions/editworkout'
import AddEventDialog from '@/modules/calendar/addevent'
import { upsertSession, upsertSessionExercise, upsertExerciseSet } from '@/supabase/upserts/upsertsession'
import { upsertClient } from '@/supabase/upserts/upsertperson'
import { Utensils, Dumbbell, Pencil, Activity, UserCheck, Plus as PlusIcon, Trash, X, Box, DollarSign, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchExercises } from '@/supabase/fetches/fetchexlib'
import { fetchPersonPackagesByPersonId, PersonPackage } from '@/supabase/fetches/fetchpersonpackages'
import { fetchPaymentsByPersonId, Payment } from '@/supabase/fetches/fetchpayments'
import { fetchPackages, Package as PackageType } from '@/supabase/fetches/fetchpackages'
import { fetchContractsByPersonId, Contract } from '@/supabase/fetches/fetchcontracts'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'


export default function PersonPage() {
  const params = useParams()
  const router = useRouter()

  const [person, setPerson] = useState<Person | null>(null)
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([])
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal[]>([])
  const [sessions, setSessions] = useState<Session[]>([]) // Changed to Session[] - no exercises needed
  const [workouts, setWorkouts] = useState<WorkoutWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)
  const [activeTab, setActiveTab] = useState<'nutrition' | 'sessions' | 'workouts' | 'progress' | 'packages' | 'payments' | 'contracts'>('progress')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [showAddWorkoutForm, setShowAddWorkoutForm] = useState(false)
  const [exerciseLibrary, setExerciseLibrary] = useState<{ id: string; name: string }[]>([])
  
  // Add workout form state
  const [newWorkoutDate, setNewWorkoutDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [newWorkoutExercises, setNewWorkoutExercises] = useState<Array<{
    exercise_id: string
    exercise_name: string
    notes: string
    sets: Array<{
      set_number: number
      weight: number | null
      reps: number | null
      rir: number | null
      rpe: number | null
      notes: string | null
    }>
  }>>([])
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({})
  const [searchValue, setSearchValue] = useState<{ [key: number]: string }>({})
  const [personPackages, setPersonPackages] = useState<PersonPackage[]>([])
  const [packages, setPackages] = useState<PackageType[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])

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

            // Fetch person_packages for this client
            try {
              const personPackagesData = await fetchPersonPackagesByPersonId(personData.id)
              setPersonPackages(personPackagesData || [])
            } catch (err) {
              console.error('Error loading person packages:', err)
              setPersonPackages([])
            }

            // Fetch payments for this client
            try {
              const paymentsData = await fetchPaymentsByPersonId(personData.id)
              setPayments(paymentsData || [])
            } catch (err) {
              console.error('Error loading payments:', err)
              setPayments([])
            }

            // Fetch contracts for this client
            try {
              const contractsData = await fetchContractsByPersonId(personData.id)
              setContracts(contractsData || [])
            } catch (err) {
              console.error('Error loading contracts:', err)
              setContracts([])
            }
          }

          // Fetch all packages (for reference in packages tab)
          try {
            const packagesData = await fetchPackages()
            setPackages(packagesData || [])
          } catch (err) {
            console.error('Error loading packages:', err)
            setPackages([])
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

          // Fetch workouts for this person with all related data (efficient batch queries)
          // Fetch for both clients and prospects - workouts are independent of conversion status
          try {
            const workoutsWithData = await fetchPersonWorkoutsWithData(personData.id)
            console.log('Fetched workouts for person:', personData.id, workoutsWithData.length, workoutsWithData)
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

  // Prevent body scroll when edit overlay is open
  useEffect(() => {
    if (editingWorkoutId && editingWorkoutId !== 'new') {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [editingWorkoutId])

  // Load exercise library when add workout form is shown
  useEffect(() => {
    const loadExerciseLibrary = async () => {
      if (showAddWorkoutForm) {
        console.log('Loading exercise library for workout form...')
        try {
          const exercises = await fetchExercises()
          console.log('Exercise library loaded:', exercises.length, 'exercises')
          setExerciseLibrary(exercises)
    } catch (err) {
          console.error('Error loading exercise library:', err)
          setExerciseLibrary([])
        }
      } else {
        // Clear when form is closed
        setExerciseLibrary([])
      }
    }
    loadExerciseLibrary()
  }, [showAddWorkoutForm])

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

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">{person.name}</h1>
        {isClient && (
          <AddEventDialog
            initialPersonId={person.id}
            initialType="Client Session"
            trigger={
              <button
                className="p-2 bg-[#333333] hover:bg-[#404040] rounded-md text-white cursor-pointer transition-colors"
                title="Schedule New Session"
              >
                <Calendar className="h-5 w-5" />
              </button>
            }
          />
        )}
      </div>

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
          <FileText className="h-5 w-5" />
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
          <Dumbbell className="h-5 w-5" />
          Workout History
        </button>
        {isClient && (
          <>
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'packages'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              } cursor-pointer`}
            >
              <Box className="h-5 w-5" />
              Packages
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              } cursor-pointer`}
            >
              <DollarSign className="h-5 w-5" />
              Payments
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === 'contracts'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              } cursor-pointer`}
            >
              <FileText className="h-5 w-5" />
              Contracts
            </button>
          </>
        )}
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
              onClick={() => setShowAddWorkoutForm(!showAddWorkoutForm)}
              className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            >
              {showAddWorkoutForm ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workout
                </>
              )}
            </Button>
          </div>

          {/* Inline Add Workout Form */}
          {showAddWorkoutForm && (
            <div className="mb-6 bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Add New Workout</h3>
              
              {/* Workout Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  Workout Date *
                </label>
                <Input
                  type="date"
                  value={newWorkoutDate}
                  onChange={(e) => setNewWorkoutDate(e.target.value)}
                  className="bg-[#1f1f1f] text-white border-[#2a2a2a] max-w-xs cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert"
                  required
                />
              </div>

              {/* Exercises */}
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-400">Exercises</label>
                  <Button
                    type="button"
                    onClick={() => {
                      setNewWorkoutExercises([...newWorkoutExercises, {
                        exercise_id: '',
                        exercise_name: '',
                        notes: '',
                        sets: [],
                      }])
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-auto cursor-pointer"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Exercise
                  </Button>
                </div>

                {newWorkoutExercises.map((exercise, exIdx) => (
                  <div key={exIdx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1 text-gray-400">
                          Exercise {exIdx + 1}
                        </label>
                        <div className="relative">
                          <Command className="bg-[#111111] border border-[#2a2a2a]">
                            <CommandInput
                              placeholder="Search exercises..."
                              value={searchValue[exIdx] || exercise.exercise_name || ''}
                              onValueChange={(value) => {
                                setSearchValue({ ...searchValue, [exIdx]: value })
                                const updated = [...newWorkoutExercises]
                                updated[exIdx].exercise_name = value
                                setNewWorkoutExercises(updated)
                                if (exerciseLibrary.length > 0) {
                                  setOpenCombobox({ ...openCombobox, [exIdx]: true })
                                }
                              }}
                              onFocus={() => {
                                if (exerciseLibrary.length > 0) {
                                  setOpenCombobox({ ...openCombobox, [exIdx]: true })
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setOpenCombobox((prev) => ({ ...prev, [exIdx]: false }))
                                }, 200)
                              }}
                              className="text-white bg-[#111111]"
                            />
                            {openCombobox[exIdx] && exerciseLibrary.length > 0 && (
                              <CommandList className="max-h-[200px] overflow-y-auto bg-[#111111] border border-[#2a2a2a]">
                                <CommandEmpty className="text-gray-400">No exercises found.</CommandEmpty>
                                <CommandGroup className="bg-[#111111]">
                                  {exerciseLibrary
                                    .filter(ex => {
                                      const search = (searchValue[exIdx] || exercise.exercise_name || '').toLowerCase()
                                      return search === '' || ex.name.toLowerCase().includes(search)
                                    })
                                    .map((ex) => (
                                      <CommandItem
                                        key={ex.id}
                                        value={ex.name}
                                        onSelect={() => {
                                          const updated = [...newWorkoutExercises]
                                          updated[exIdx] = {
                                            ...updated[exIdx],
                                            exercise_id: ex.id,
                                            exercise_name: ex.name,
                                          }
                                          setNewWorkoutExercises(updated)
                                          setOpenCombobox((prev) => ({ ...prev, [exIdx]: false }))
                                          setSearchValue((prev) => ({ ...prev, [exIdx]: ex.name }))
                                        }}
                                        className="text-white hover:bg-[#2a2a2a] cursor-pointer bg-[#111111]"
                                      >
                                        {ex.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            )}
                          </Command>
                          {exercise.exercise_name && (
                            <p className="text-xs text-gray-300 mt-1">{exercise.exercise_name}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = newWorkoutExercises.filter((_, i) => i !== exIdx)
                          setNewWorkoutExercises(updated)
                        }}
                        className="p-1 text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Exercise Notes */}
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Exercise notes (optional)"
                        value={exercise.notes}
                        onChange={(e) => {
                          const updated = [...newWorkoutExercises]
                          updated[exIdx].notes = e.target.value
                          setNewWorkoutExercises(updated)
                        }}
                        className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-sm"
                      />
                    </div>

                    {/* Sets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-400">Sets</label>
                        <Button
                          type="button"
                          onClick={() => {
                            const updated = [...newWorkoutExercises]
                            updated[exIdx].sets = [...updated[exIdx].sets, {
                              set_number: updated[exIdx].sets.length + 1,
                              weight: null,
                              reps: null,
                              rir: null,
                              rpe: null,
                              notes: null,
                            }]
                            setNewWorkoutExercises(updated)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto cursor-pointer"
                        >
                          <PlusIcon className="h-3 w-3 mr-1" />
                          Add Set
                        </Button>
                      </div>

                      {exercise.sets.length > 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-400 pb-1 border-b border-[#2a2a2a]">
                            <div>Set</div>
                            <div>Weight</div>
                            <div>Reps</div>
                            <div>RIR</div>
                            <div>RPE</div>
                            <div>Notes</div>
                            <div></div>
                          </div>
                          {exercise.sets.map((set, setIdx) => (
                            <div key={setIdx} className="grid grid-cols-7 gap-2 items-center">
                              <div className="text-xs text-gray-300">{set.set_number}</div>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Weight"
                                value={set.weight ?? ''}
                                onChange={(e) => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets[setIdx].weight = e.target.value ? parseFloat(e.target.value) : null
                                  setNewWorkoutExercises(updated)
                                }}
                                className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <Input
                                type="number"
                                placeholder="Reps"
                                value={set.reps ?? ''}
                                onChange={(e) => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets[setIdx].reps = e.target.value ? parseInt(e.target.value) : null
                                  setNewWorkoutExercises(updated)
                                }}
                                className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <Input
                                type="number"
                                placeholder="RIR"
                                value={set.rir ?? ''}
                                onChange={(e) => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets[setIdx].rir = e.target.value ? parseInt(e.target.value) : null
                                  setNewWorkoutExercises(updated)
                                }}
                                className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="RPE"
                                value={set.rpe ?? ''}
                                onChange={(e) => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets[setIdx].rpe = e.target.value ? parseFloat(e.target.value) : null
                                  setNewWorkoutExercises(updated)
                                }}
                                className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <Input
                                type="text"
                                placeholder="Notes"
                                value={set.notes ?? ''}
                                onChange={(e) => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets[setIdx].notes = e.target.value || null
                                  setNewWorkoutExercises(updated)
                                }}
                                className="bg-[#1f1f1f] text-white border-[#2a2a2a] text-xs h-8"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...newWorkoutExercises]
                                  updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx)
                                  // Renumber sets
                                  updated[exIdx].sets = updated[exIdx].sets.map((s, i) => ({
                                    ...s,
                                    set_number: i + 1,
                                  }))
                                  setNewWorkoutExercises(updated)
                                }}
                                className="p-1 text-red-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!person) return
                    if (!newWorkoutDate) {
                      alert('Please select a workout date')
                      return
                    }
                    if (newWorkoutExercises.length === 0) {
                      alert('Please add at least one exercise')
                      return
                    }
                    if (newWorkoutExercises.some(ex => !ex.exercise_id || ex.exercise_id.trim() === '')) {
                      alert('Please select an exercise for all exercise entries')
                      return
                    }

                    try {
                      // Create workout with workout_date
                      const newWorkout = await upsertWorkout({
                        person_id: person.id,
                        day_id: null,
                        completed: true, // Mark as completed since it's a historical workout
                        workout_date: new Date(newWorkoutDate).toISOString(),
                      })

                      // Create exercises and sets
                      for (let i = 0; i < newWorkoutExercises.length; i++) {
                        const exercise = newWorkoutExercises[i]
                        const sessionExercise = await upsertSessionExercise({
                          workout_id: newWorkout.id,
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

                      // Reload workouts
                      const workoutsWithData = await fetchPersonWorkoutsWithData(person.id)
                      setWorkouts(workoutsWithData)
                      
                      // Reset form
                      setNewWorkoutDate(new Date().toISOString().split('T')[0])
                      setNewWorkoutExercises([])
                      setShowAddWorkoutForm(false)
                      setOpenCombobox({})
                      setSearchValue({})
                    } catch (error) {
                      console.error('Error creating workout:', error)
                      alert('Error creating workout. Please try again.')
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                >
                  Save Workout
                </Button>
                <Button
                  onClick={() => {
                    setShowAddWorkoutForm(false)
                    setNewWorkoutDate(new Date().toISOString().split('T')[0])
                    setNewWorkoutExercises([])
                    setOpenCombobox({})
                    setSearchValue({})
                  }}
                  variant="outline"
                  className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {workouts.length === 0 && !showAddWorkoutForm ? (
            <p className="text-gray-400">No workouts found.</p>
          ) : (
            <div className="space-y-4">
              {workouts
                .sort((a, b) => {
                  // Sort by workout_date (most recent first), fallback to created_at
                  const dateA = a.workout_date ? new Date(a.workout_date).getTime() : new Date(a.created_at).getTime()
                  const dateB = b.workout_date ? new Date(b.workout_date).getTime() : new Date(b.created_at).getTime()
                  return dateB - dateA
                })
                .map((workout) => (
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
                        {workout.workout_date 
                          ? new Date(workout.workout_date).toLocaleString()
                          : new Date(workout.created_at).toLocaleString()}
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
          {/* Convert workouts to SessionWithExercises format for charts - use workout data primarily */}
          <WorkoutVolumeChart sessions={workouts
            .filter(w => {
              // Only include workouts with exercises and a workout_date
              return w.exercises && w.exercises.length > 0 && w.workout_date
            })
            .map(w => ({
              // Use session data if available, otherwise create a session-like object from workout
              id: w.session?.id || w.id,
              person_id: w.person_id,
              trainer_id: w.session?.trainer_id || null,
              type: w.session?.type || 'Client Session' as any,
              workout_id: w.id,
              person_package_id: w.session?.person_package_id || null,
              start_time: w.session?.start_time || null,
              // Use workout_date as the primary date (never fall back to created_at)
              started_at: w.workout_date!,
              end_time: w.session?.end_time || null,
              created_at: w.created_at,
              converted: w.session?.converted || false,
              status: w.session?.status || 'completed' as any,
              exercises: w.exercises || [],
            })) as SessionWithExercises[]} />
          <RPERIRChart sessions={workouts
            .filter(w => {
              // Only include workouts with exercises and a workout_date
              return w.exercises && w.exercises.length > 0 && w.workout_date
            })
            .map(w => ({
              id: w.session?.id || w.id,
              person_id: w.person_id,
              trainer_id: w.session?.trainer_id || null,
              type: w.session?.type || 'Client Session' as any,
              workout_id: w.id,
              person_package_id: w.session?.person_package_id || null,
              start_time: w.session?.start_time || null,
              // Use workout_date as the primary date (never fall back to created_at)
              started_at: w.workout_date!,
              end_time: w.session?.end_time || null,
              created_at: w.created_at,
              converted: w.session?.converted || false,
              status: w.session?.status || 'completed' as any,
              exercises: w.exercises || [],
            })) as SessionWithExercises[]} />
          <WeightProgressionChart sessions={workouts
            .filter(w => {
              // Only include workouts with exercises and a workout_date
              return w.exercises && w.exercises.length > 0 && w.workout_date
            })
            .map(w => ({
              id: w.session?.id || w.id,
              person_id: w.person_id,
              trainer_id: w.session?.trainer_id || null,
              type: w.session?.type || 'Client Session' as any,
              workout_id: w.id,
              person_package_id: w.session?.person_package_id || null,
              start_time: w.session?.start_time || null,
              // Use workout_date as the primary date (never fall back to created_at)
              started_at: w.workout_date!,
              end_time: w.session?.end_time || null,
              created_at: w.created_at,
              converted: w.session?.converted || false,
              status: w.session?.status || 'completed' as any,
              exercises: w.exercises || [],
            })) as SessionWithExercises[]} />
        </div>
      )}

      {activeTab === 'packages' && isClient && (
        <Packages personPackages={personPackages} packages={packages} />
      )}

      {activeTab === 'payments' && isClient && person && (
        <Payments 
          payments={payments} 
          personPackages={personPackages} 
          packages={packages}
          personId={person.id}
          onPaymentAdded={async () => {
            // Reload payments and person packages after payment is added/updated/deleted
            try {
              const paymentsData = await fetchPaymentsByPersonId(person.id)
              setPayments(paymentsData || [])
              const personPackagesData = await fetchPersonPackagesByPersonId(person.id)
              setPersonPackages(personPackagesData || [])
            } catch (err) {
              console.error('Error reloading payments:', err)
            }
          }}
        />
      )}

      {activeTab === 'contracts' && isClient && (
        <Contracts contracts={contracts} packages={packages} />
      )}

      {/* Edit Workout Overlay - Full screen except sidebar */}
      {editingWorkoutId && editingWorkoutId !== 'new' && (() => {
        const workoutToEdit = workouts.find(w => w.id === editingWorkoutId)
        
        return (
          <div className="fixed inset-0 bg-[#111111] z-50 overflow-y-auto overflow-x-hidden" style={{ marginLeft: '256px' }}>
            <div className="max-w-4xl mx-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Workout</h2>
                <button
                  onClick={() => setEditingWorkoutId(null)}
                  className="p-2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
          <EditWorkout
                open={!!editingWorkoutId}
            onOpenChange={(open) => {
                  if (!open) setEditingWorkoutId(null)
            }}
                sessionId={workoutToEdit?.session?.id}
                initialExercises={workoutToEdit?.exercises}
            mode="edit"
                hideDialog={true}
            onSave={async (data) => {
              try {
                if (!person) {
                  throw new Error('Person not found')
                }

                // Update existing workout
                if (!workoutToEdit) {
                  throw new Error('Workout not found')
                }
                const workoutId = workoutToEdit.id

                // Delete all existing exercises for this workout (cascade will handle sets)
                const { error: deleteError } = await supabase
                  .from('session_exercises')
                  .delete()
                  .eq('workout_id', workoutId)

                if (deleteError) throw deleteError

                // Filter out exercises without valid exercise_id
                const validExercises = data.exercises.filter(ex => ex.exercise_id && ex.exercise_id.trim() !== '')
                
                if (validExercises.length === 0) {
                  alert('Please select at least one exercise before saving.')
                  throw new Error('No valid exercises to save')
                }

                if (validExercises.length !== data.exercises.length) {
                  alert(`Warning: ${data.exercises.length - validExercises.length} exercise(s) without a selected exercise were skipped.`)
                }

                // Create new exercises and sets (using workout_id)
                // Use array index as position to ensure 0-indexed positions
                for (let i = 0; i < validExercises.length; i++) {
                  const exercise = validExercises[i]
                  
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

                // Reload workouts efficiently
                const workoutsWithData = await fetchPersonWorkoutsWithData(person.id)
                setWorkouts(workoutsWithData)
                setEditingWorkoutId(null)
              } catch (error) {
                console.error('Error saving workout:', error)
                alert('Error saving workout. Please try again.')
                throw error
              }
            }}
          />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

