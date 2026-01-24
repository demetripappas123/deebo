import { supabase } from '@/supabase/supabaseClient'
import { ExerciseLibraryItem } from './fetchexlib'

export type UserExercise = ExerciseLibraryItem & {
  user_id: string
}

export async function fetchUserExercises(userId?: string | null): Promise<UserExercise[]> {
  try {
    let query = supabase
      .from('user_exercises')
      .select('*')
      .order('name', { ascending: true })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user exercises:', error)
      return []
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name || '',
      video_url: item.video_url || null,
      gif_url: item.gif_url || null,
      img_url: item.img_url || null,
      variations: item.variations || null,
      created_at: item.created_at || new Date().toISOString(),
      user_id: item.user_id,
    })) as UserExercise[]
  } catch (err) {
    console.error('Error fetching user exercises:', err)
    return []
  }
}


