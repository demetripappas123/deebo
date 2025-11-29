import { supabase } from '@/supabase/supabaseClient'

export type DayExercise = {
  day_id: string
  exercise_def_id: string
  sets: number
  reps: number
  rir: number | null
  rpe: number | null
  notes: string
  weight_used?: number | null
}

/**
 * Upserts multiple exercises for a day.
 * Handles new inserts or updates existing exercises based on unique constraint.
 */
export async function upsertDayExercises(
  exercises: DayExercise[]
): Promise<DayExercise[] | null> {
  if (!exercises.length) return null

  try {
    // Map exercises to ensure proper format and handle nulls
    const formattedExercises = exercises.map(ex => ({
      day_id: ex.day_id,
      exercise_def_id: ex.exercise_def_id,
      sets: ex.sets,
      reps: ex.reps,
      rir: ex.rir ?? null,
      rpe: ex.rpe ?? null,
      notes: ex.notes || '',
      weight_used: ex.weight_used ?? null,
    }))

    const { data, error } = await supabase
      .from('program_exercises')
      .insert(formattedExercises)
      .select('*')

    if (error) {
      console.error('upsertDayExercises error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    return data as DayExercise[]
  } catch (err) {
    console.error('upsertDayExercises error:', err)
    return null
  }
}
