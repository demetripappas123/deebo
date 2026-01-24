import { supabase } from '@/supabase/supabaseClient'

export async function deleteUserExercise(exerciseId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_exercises')
      .delete()
      .eq('id', exerciseId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting user exercise:', err)
    return false
  }
}


