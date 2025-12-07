import { supabase } from '../supabaseClient'
import { Session, SessionType, SessionStatus } from '../fetches/fetchsessions'

export interface SessionFormData {
  id?: string
  client_id?: string | null
  prospect_id?: string | null
  trainer_id?: string | null
  type: SessionType
  status?: SessionStatus
  workout_id?: string | null
  day_id?: string | null
  start_time?: string | null
  end_time?: string | null
}

export interface SessionExerciseFormData {
  id?: string
  session_id: string
  exercise_id: string // UUID
  position: number
  notes?: string | null
}

export interface ExerciseSetFormData {
  id?: string
  session_exercise_id: string
  set_number: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  notes?: string | null
}

/**
 * Create or update a session
 */
export async function upsertSession(session: SessionFormData): Promise<Session> {
  const sessionData: any = {
    type: session.type,
    status: session.status || 'pending',
  }
  
  // Only include optional fields if they have values
  if (session.client_id !== undefined) {
    sessionData.client_id = session.client_id
  }
  if (session.prospect_id !== undefined) {
    sessionData.prospect_id = session.prospect_id
  }
  if (session.trainer_id !== undefined && session.trainer_id !== null) {
    sessionData.trainer_id = session.trainer_id
  }
  if (session.workout_id !== undefined && session.workout_id !== null) {
    sessionData.workout_id = session.workout_id
  }
  if (session.day_id !== undefined && session.day_id !== null) {
    sessionData.day_id = session.day_id
  }
  if (session.start_time !== undefined && session.start_time !== null) {
    sessionData.start_time = session.start_time
  }
  if (session.end_time !== undefined && session.end_time !== null) {
    sessionData.end_time = session.end_time
  }

  if (session.id) {
    // Update existing session
    const { data, error } = await supabase
      .from('sessions')
      .update(sessionData)
      .eq('id', session.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      throw error
    }

    return data
  } else {
    // Create new session
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw error
    }

    return data
  }
}

/**
 * Create or update a session exercise
 */
export async function upsertSessionExercise(
  exercise: SessionExerciseFormData
): Promise<any> {
  const exerciseData: any = {
    session_id: exercise.session_id,
    exercise_id: exercise.exercise_id,
    position: exercise.position,
    notes: exercise.notes ?? null,
  }

  if (exercise.id) {
    // Update existing exercise
    const { data, error } = await supabase
      .from('session_exercises')
      .update(exerciseData)
      .eq('id', exercise.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating session exercise:', error)
      throw error
    }

    return data
  } else {
    // Create new exercise
    const { data, error } = await supabase
      .from('session_exercises')
      .insert([exerciseData])
      .select()
      .single()

    if (error) {
      console.error('Error creating session exercise:', error)
      throw error
    }

    return data
  }
}

/**
 * Create or update an exercise set
 */
export async function upsertExerciseSet(set: ExerciseSetFormData): Promise<any> {
  const setData: any = {
    session_exercise_id: set.session_exercise_id,
    set_number: set.set_number,
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    rir: set.rir ?? null,
    rpe: set.rpe ?? null,
    notes: set.notes ?? null,
  }

  if (set.id) {
    // Update existing set
    const { data, error } = await supabase
      .from('exercise_sets')
      .update(setData)
      .eq('id', set.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating exercise set:', error)
      throw error
    }

    return data
  } else {
    // Create new set
    const { data, error } = await supabase
      .from('exercise_sets')
      .insert([setData])
      .select()
      .single()

    if (error) {
      console.error('Error creating exercise set:', error)
      throw error
    }

    return data
  }
}

/**
 * Upsert multiple session exercises (smart update - compares and updates/inserts/deletes as needed)
 */
export async function upsertSessionExercises(
  sessionId: string,
  exercises: Omit<SessionExerciseFormData, 'session_id' | 'id'>[]
): Promise<any> {
  // Fetch existing exercises
  const { data: existingExercises, error: fetchError } = await supabase
    .from('session_exercises')
    .select('*')
    .eq('session_id', sessionId)

  if (fetchError) {
    console.error('Error fetching existing exercises:', fetchError)
    throw fetchError
  }

  const existingIds = new Set((existingExercises || []).map((e) => e.id))
  const newExerciseIds = new Set(
    exercises
      .map((e, idx) => {
        // Try to match by position and exercise_id
        const match = existingExercises?.find(
          (ex) => ex.position === idx && ex.exercise_id === e.exercise_id
        )
        return match?.id
      })
      .filter((id): id is string => id !== undefined)
  )

  // Delete exercises that are no longer in the list
  const toDelete = (existingExercises || []).filter(
    (e) => !newExerciseIds.has(e.id)
  )
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map((e) => e.id)
    const { error: deleteError } = await supabase
      .from('session_exercises')
      .delete()
      .in('id', deleteIds)

    if (deleteError) {
      console.error('Error deleting exercises:', deleteError)
      throw deleteError
    }
  }

  // Upsert exercises
  const upsertPromises = exercises.map((exercise, index) => {
    const existing = existingExercises?.find(
      (e) => e.position === index && e.exercise_id === exercise.exercise_id
    )

    return upsertSessionExercise({
      id: existing?.id,
      session_id: sessionId,
      exercise_id: exercise.exercise_id,
      position: index,
      notes: exercise.notes ?? null,
    })
  })

  return Promise.all(upsertPromises)
}

/**
 * Update a session with partial data (only updates provided fields)
 * Use this for editing individual fields without needing all session data
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<SessionFormData, 'id' | 'client_id' | 'trainer_id' | 'type'>>
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating session:', error)
    throw error
  }

  return data
}

/**
 * Update a session exercise with partial data (only updates provided fields)
 * Use this for editing individual fields like notes or position
 */
export async function updateSessionExercise(
  exerciseId: string,
  updates: Partial<Omit<SessionExerciseFormData, 'id' | 'session_id'>>
): Promise<any> {
  const { data, error } = await supabase
    .from('session_exercises')
    .update(updates)
    .eq('id', exerciseId)
    .select()
    .single()

  if (error) {
    console.error('Error updating session exercise:', error)
    throw error
  }

  return data
}

/**
 * Update an exercise set with partial data (only updates provided fields)
 * Use this for editing individual set fields like weight, reps, rir, rpe, notes
 */
export async function updateExerciseSet(
  setId: string,
  updates: Partial<Omit<ExerciseSetFormData, 'id' | 'session_exercise_id' | 'set_number'>>
): Promise<any> {
  const { data, error } = await supabase
    .from('exercise_sets')
    .update(updates)
    .eq('id', setId)
    .select()
    .single()

  if (error) {
    console.error('Error updating exercise set:', error)
    throw error
  }

  return data
}

/**
 * Upsert multiple exercise sets for a session exercise
 */
export async function upsertExerciseSets(
  sessionExerciseId: string,
  sets: Omit<ExerciseSetFormData, 'session_exercise_id' | 'id'>[]
): Promise<any> {
  // Fetch existing sets
  const { data: existingSets, error: fetchError } = await supabase
    .from('exercise_sets')
    .select('*')
    .eq('session_exercise_id', sessionExerciseId)

  if (fetchError) {
    console.error('Error fetching existing sets:', fetchError)
    throw fetchError
  }

  const existingIds = new Set((existingSets || []).map((s) => s.id))
  const newSetIds = new Set(
    sets
      .map((s) => {
        const match = existingSets?.find((ex) => ex.set_number === s.set_number)
        return match?.id
      })
      .filter((id): id is string => id !== undefined)
  )

  // Delete sets that are no longer in the list
  const toDelete = (existingSets || []).filter((s) => !newSetIds.has(s.id))
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map((s) => s.id)
    const { error: deleteError } = await supabase
      .from('exercise_sets')
      .delete()
      .in('id', deleteIds)

    if (deleteError) {
      console.error('Error deleting sets:', deleteError)
      throw deleteError
    }
  }

  // Upsert sets
  const upsertPromises = sets.map((set) => {
    const existing = existingSets?.find((s) => s.set_number === set.set_number)

    return upsertExerciseSet({
      id: existing?.id,
      session_exercise_id: sessionExerciseId,
      set_number: set.set_number,
      weight: set.weight ?? null,
      reps: set.reps ?? null,
      rir: set.rir ?? null,
      rpe: set.rpe ?? null,
      notes: set.notes ?? null,
    })
  })

  return Promise.all(upsertPromises)
}

