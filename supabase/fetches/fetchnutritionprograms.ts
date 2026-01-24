import { supabase } from '@/supabase/supabaseClient'

export type NutritionProgram = {
  id: string
  name: string
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export async function fetchNutritionPrograms(userId?: string | null): Promise<NutritionProgram[]> {
  try {
    let query = supabase
      .from('nutrition_programs')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
        console.warn('nutrition_programs table does not exist yet')
        return []
      }
      throw error
    }

    // Sort by created_at if it exists, otherwise just return data
    const sorted = data ? [...data].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    }) : []

    return sorted as NutritionProgram[]
  } catch (err) {
    console.error('Error fetching nutrition programs:', err)
    return []
  }
}

