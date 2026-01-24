import { supabase } from '@/supabase/supabaseClient'

export async function deleteCommunityExercise(exerciseId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting community exercise:', err)
    return false
  }
}


