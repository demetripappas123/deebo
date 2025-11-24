import { supabase } from '../supabaseClient'
import { Program } from '../upserts/upsertprogram'

export async function fetchPrograms(userId?: number): Promise<Program[]> {
  let query = supabase.from('programs').select('*')

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching programs:', error)
    return []
  }

  return (data ?? []) as Program[]
}
