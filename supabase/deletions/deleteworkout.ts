import { supabase } from '../supabaseClient'

/**
 * Delete a workout by ID
 * Note: This will cascade delete workout_exercises and exercise_sets due to ON DELETE CASCADE
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)

  if (error) {
    console.error('Error deleting workout:', error)
    throw error
  }
}





