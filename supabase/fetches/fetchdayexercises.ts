import { supabase } from '@/supabase/supabaseClient'

export type DayExerciseWithName = {
  day_id: string
  exercise_def_id: string
  exercise_name: string
  sets: number
  reps: number
  rir: number | null
  rpe: number | null
  notes: string
  weight_used: number | null
}

export async function fetchDayExercises(dayId: string): Promise<DayExerciseWithName[]> {
  try {
    const { data, error } = await supabase
      .from('program_exercises')
      .select(`
        day_id,
        exercise_def_id,
        sets,
        reps,
        rir,
        rpe,
        notes,
        weight_used,
        exercise_library:exercise_def_id (
          id,
          name
        )
      `)
      .eq('day_id', dayId)
      .order('exercise_def_id', { ascending: true })

    if (error) {
      console.error('fetchDayExercises error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    if (!data) return []

    // Map the response to include exercise name
    const exercises: DayExerciseWithName[] = data.map((ex: any) => ({
      day_id: ex.day_id,
      exercise_def_id: ex.exercise_def_id,
      exercise_name: ex.exercise_library?.name || 'Unknown Exercise',
      sets: ex.sets,
      reps: ex.reps,
      rir: ex.rir,
      rpe: ex.rpe,
      notes: ex.notes || '',
      weight_used: ex.weight_used,
    }))

    return exercises
  } catch (err) {
    console.error('fetchDayExercises unexpected error:', err)
    return []
  }
}

