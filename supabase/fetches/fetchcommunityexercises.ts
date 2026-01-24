import { supabase } from '@/supabase/supabaseClient'
import { ExerciseLibraryItem } from './fetchexlib'

export type CommunityExercise = ExerciseLibraryItem & {
  created_by?: string | null
  created_at: string
}

export async function fetchCommunityExercises(): Promise<CommunityExercise[]> {
  try {
    const { data, error } = await supabase
      .from('community_exercises')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching community exercises:', error)
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
      created_by: item.created_by || null,
    })) as CommunityExercise[]
  } catch (err) {
    console.error('Error fetching community exercises:', err)
    return []
  }
}

