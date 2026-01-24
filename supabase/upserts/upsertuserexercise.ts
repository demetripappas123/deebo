import { supabase } from '@/supabase/supabaseClient'
import { UserExercise } from '@/supabase/fetches/fetchuserexercises'

export type UserExerciseInput = {
  id?: string
  name: string
  video_url?: string | null
  gif_url?: string | null
  img_url?: string | null
  variations?: string[] | null
  user_id: string
}

export async function upsertUserExercise(exercise: UserExerciseInput): Promise<UserExercise | null> {
  try {
    const exerciseData = {
      name: exercise.name.trim(),
      video_url: exercise.video_url?.trim() || null,
      gif_url: exercise.gif_url?.trim() || null,
      img_url: exercise.img_url?.trim() || null,
      variations: exercise.variations || null,
      user_id: exercise.user_id,
      updated_at: new Date().toISOString(),
    }

    if (exercise.id) {
      // Update existing exercise
      const { data, error } = await supabase
        .from('user_exercises')
        .update(exerciseData)
        .eq('id', exercise.id)
        .eq('user_id', exercise.user_id)
        .select()
        .single()

      if (error) throw error
      return data as UserExercise
    } else {
      // Insert new exercise
      const { data, error } = await supabase
        .from('user_exercises')
        .insert([exerciseData])
        .select()
        .single()

      if (error) throw error
      return data as UserExercise
    }
  } catch (err) {
    console.error('Error upserting user exercise:', err)
    return null
  }
}


