// lib/clients.ts
import { supabase } from '../supabaseClient'

export interface ClientFormData {
  id?: string
  name: string
  number?: string
  notes?: string
  program_id?: string | null
  created_at?: string
}

/**
 * Upserts a client into the "clients" table.
 * Fills in defaults for any missing fields.
 * Uses id only if updating; lets DB generate it for new inserts.
 */
export async function upsertClient(client: Partial<ClientFormData>) {
  const fullClient: ClientFormData = {
    name: client.name ?? 'Unnamed Client',
    number: client.number ?? '',
    notes: client.notes ?? '',
    program_id: client.program_id ?? null,
    created_at: client.created_at ?? new Date().toISOString(),
    ...(client.id ? { id: client.id } : {}), // include id only if it exists
  }

  const { data, error } = await supabase
    .from('clients')
    .upsert([fullClient], { onConflict: 'id' }) // create or update based on PK
    .select()

  if (error) {
    console.error('Error upserting client:', error)
    throw error
  }

  return data
}
