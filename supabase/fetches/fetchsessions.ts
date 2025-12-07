import { supabase } from '../supabaseClient'

export type SessionType = 'KO' | 'SGA' | 'KOFU' | 'Client Session' | 'Prospect Session'
export type SessionStatus = 'pending' | 'completed' | 'canceled with charge' | 'canceled no charge'

export interface Session {
  id: string
  client_id: string | null
  prospect_id: string | null
  trainer_id: string | null
  type: SessionType
  status: SessionStatus
  workout_id: string | null
  day_id: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
}

export interface SessionWithExercises extends Session {
  exercises?: SessionExerciseWithSets[]
}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string // UUID from exercise_library
  position: number
  notes: string | null
  created_at: string
}

export interface SessionExerciseWithName extends SessionExercise {
  exercise_name?: string
  sets?: ExerciseSet[]
}

export interface ExerciseSet {
  id: string
  session_exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  rpe: number | null
  notes: string | null
  created_at: string
}

export interface SessionExerciseWithSets extends SessionExercise {
  exercise_name?: string
  sets: ExerciseSet[]
}

/**
 * Fetch all sessions
 */
export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single session by ID
 */
export async function fetchSessionById(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching session:', error)
    throw error
  }

  return data
}

/**
 * Fetch sessions for a specific client
 */
export async function fetchClientSessions(clientId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching client sessions:', error)
    throw error
  }

  return data ?? []
}


/**
 * Fetch a session with all exercises and sets
 */
export async function fetchSessionWithExercises(sessionId: string): Promise<SessionWithExercises | null> {
  // Fetch session
  const session = await fetchSessionById(sessionId)
  if (!session) return null

  // Fetch exercises for this session
  const { data: exercises, error: exercisesError } = await supabase
    .from('session_exercises')
    .select(`
      *,
      exercise_library:exercise_id (
        id,
        name
      )
    `)
    .eq('session_id', sessionId)
    .order('position', { ascending: true })

  if (exercisesError) {
    console.error('Error fetching session exercises:', exercisesError)
    throw exercisesError
  }

  // Fetch sets for each exercise
  const exercisesWithSets: SessionExerciseWithSets[] = await Promise.all(
    (exercises || []).map(async (exercise) => {
      const { data: sets, error: setsError } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('session_exercise_id', exercise.id)
        .order('set_number', { ascending: true })

      if (setsError) {
        console.error('Error fetching exercise sets:', setsError)
        throw setsError
      }

      return {
        ...exercise,
        exercise_name: (exercise.exercise_library as any)?.name,
        sets: sets ?? [],
      }
    })
  )

  return {
    ...session,
    exercises: exercisesWithSets,
  }
}

/**
 * Fetch exercises for a session
 */
export async function fetchSessionExercises(sessionId: string): Promise<SessionExerciseWithName[]> {
  const { data, error } = await supabase
    .from('session_exercises')
    .select(`
      *,
      exercise_library:exercise_id (
        id,
        name
      )
    `)
    .eq('session_id', sessionId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching session exercises:', error)
    throw error
  }

  return (data || []).map((exercise) => ({
    ...exercise,
    exercise_name: (exercise.exercise_library as any)?.name,
  }))
}

/**
 * Fetch sets for a session exercise
 */
export async function fetchExerciseSets(sessionExerciseId: string): Promise<ExerciseSet[]> {
  const { data, error } = await supabase
    .from('exercise_sets')
    .select('*')
    .eq('session_exercise_id', sessionExerciseId)
    .order('set_number', { ascending: true })

  if (error) {
    console.error('Error fetching exercise sets:', error)
    throw error
  }

  return data ?? []
}

