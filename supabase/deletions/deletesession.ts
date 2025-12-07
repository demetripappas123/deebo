import { supabase } from '../supabaseClient'

/**
 * Delete a session by ID
 * Note: This will cascade delete session_exercises and exercise_sets due to ON DELETE CASCADE
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting session:', error)
    throw error
  }
}

/**
 * Delete a session exercise by ID
 * Note: This will cascade delete exercise_sets due to ON DELETE CASCADE
 */
export async function deleteSessionExercise(sessionExerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .delete()
    .eq('id', sessionExerciseId)

  if (error) {
    console.error('Error deleting session exercise:', error)
    throw error
  }
}

/**
 * Delete all exercises for a session
 */
export async function deleteSessionExercises(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .delete()
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error deleting session exercises:', error)
    throw error
  }
}

/**
 * Delete an exercise set by ID
 */
export async function deleteExerciseSet(setId: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_sets')
    .delete()
    .eq('id', setId)

  if (error) {
    console.error('Error deleting exercise set:', error)
    throw error
  }
}

/**
 * Delete all sets for a session exercise
 */
export async function deleteExerciseSets(sessionExerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_sets')
    .delete()
    .eq('session_exercise_id', sessionExerciseId)

  if (error) {
    console.error('Error deleting exercise sets:', error)
    throw error
  }
}

