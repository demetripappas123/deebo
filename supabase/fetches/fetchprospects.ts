import { supabase } from '../supabaseClient'

export type Prospect = {
  id: string
  name: string
  number?: string
  program_id?: string | null
  notes?: string | null
  created_at: string
}

export async function fetchProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching prospects:', error)
    throw error
  }

  return data || []
}
