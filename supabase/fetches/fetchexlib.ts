import { supabase } from '@/supabase/supabaseClient'

export type ExerciseLibraryItem = {
  id: string
  name: string
  created_at: string
}

export async function fetchExercises(): Promise<ExerciseLibraryItem[]> {
  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data as ExerciseLibraryItem[]
  } catch (err) {
    console.error('Error fetching exercises:', err)
    return []
  }
}
