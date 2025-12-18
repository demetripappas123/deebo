import { supabase } from '../supabaseClient'
import { Workout } from './fetchworkouts'
import { Session } from './fetchsessions'

export interface WorkoutWithData extends Workout {
  session?: Session | null
  workout_date: string | null // Date when the workout was performed
  exercises?: Array<{
    id: string
    workout_id: string
    exercise_id: string
    position: number
    notes: string | null
    created_at: string
    exercise_name?: string
    sets: Array<{
      id: string
      session_exercise_id: string
      set_number: number
      weight: number | null
      reps: number | null
      rir: number | null
      rpe: number | null
      notes: string | null
      created_at: string
    }>
  }>
}

/**
 * Efficiently fetch all workouts for a person with all related data (sessions, exercises, sets)
 * Uses batch queries instead of sequential queries for better performance
 */
export async function fetchPersonWorkoutsWithData(personId: string): Promise<WorkoutWithData[]> {
  // Step 1: Fetch all completed workouts for this person
  // First, let's check all workouts to see what we have
  const { data: allWorkouts, error: allWorkoutsError } = await supabase
    .from('workouts')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })

  console.log('All workouts for person:', personId, allWorkouts?.length, allWorkouts)

  if (allWorkoutsError) {
    console.error('Error fetching all workouts:', allWorkoutsError)
    throw allWorkoutsError
  }

  // Filter to only completed workouts
  const workouts = allWorkouts?.filter(w => w.completed === true) || []
  
  console.log('Completed workouts:', workouts.length, workouts)

  if (workouts.length === 0) {
    console.warn('No completed workouts found for person:', personId)
    return []
  }

  const workoutIds = workouts.map(w => w.id)

  // Step 2: Fetch all sessions for these workouts in one query
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .in('workout_id', workoutIds)

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError)
    // Don't throw - continue without sessions
  }

  // Create a map of workout_id -> session for quick lookup
  const sessionMap = new Map<string, Session>()
  if (sessions) {
    sessions.forEach(session => {
      if (session.workout_id) {
        sessionMap.set(session.workout_id, session)
      }
    })
  }

  // Step 3: Fetch all exercises for these workouts in one query
  const { data: exercises, error: exercisesError } = await supabase
    .from('session_exercises')
    .select(`
      *,
      exercise_library:exercise_id (
        id,
        name
      )
    `)
    .in('workout_id', workoutIds)
    .order('position', { ascending: true })

  if (exercisesError) {
    console.error('Error fetching exercises:', exercisesError)
    // Don't throw - continue without exercises
  }

  // Create a map of workout_id -> exercises
  const exercisesMap = new Map<string, typeof exercises>()
  if (exercises) {
    exercises.forEach(exercise => {
      const workoutId = exercise.workout_id
      if (!exercisesMap.has(workoutId)) {
        exercisesMap.set(workoutId, [])
      }
      exercisesMap.get(workoutId)!.push(exercise)
    })
  }

  // Step 4: Fetch all sets for these exercises in one query
  const exerciseIds = exercises?.map(e => e.id) || []
  let setsMap = new Map<string, any[]>()
  
  if (exerciseIds.length > 0) {
    const { data: sets, error: setsError } = await supabase
      .from('exercise_sets')
      .select('*')
      .in('session_exercise_id', exerciseIds)
      .order('set_number', { ascending: true })

    if (setsError) {
      console.error('Error fetching sets:', setsError)
      // Don't throw - continue without sets
    } else if (sets) {
      // Create a map of session_exercise_id -> sets
      sets.forEach(set => {
        const exerciseId = set.session_exercise_id
        if (!setsMap.has(exerciseId)) {
          setsMap.set(exerciseId, [])
        }
        setsMap.get(exerciseId)!.push(set)
      })
    }
  }

  // Step 5: Combine all data
  return workouts.map(workout => {
    const session = sessionMap.get(workout.id) || null
    const workoutExercises = exercisesMap.get(workout.id) || []
    
    const exercisesWithSets = workoutExercises.map(exercise => ({
      ...exercise,
      exercise_name: (exercise.exercise_library as any)?.name,
      sets: setsMap.get(exercise.id) || [],
    }))

    return {
      ...workout,
      session,
      exercises: exercisesWithSets,
    }
  })
}

