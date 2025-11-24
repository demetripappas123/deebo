// lib/clients.ts
import { supabase } from '../supabaseClient'

export interface Client {
  id: string
  name: string
  number: string
  program_id?: string | null
  created_at: string
  notes?: string | null
}

/**
 * Fetches all clients from the "clients" table.
 */
export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false }) // optional: newest first

  if (error) {
    console.error('Error fetching clients:', error)
    throw error
  }

  return data || []
}
