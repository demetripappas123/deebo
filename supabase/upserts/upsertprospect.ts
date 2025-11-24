// lib/prospects.ts
import { supabase } from '../supabaseClient'

export interface ProspectFormData {
  id?: string
  name: string
  number?: string
  program_id?: string | null
  created_at?: string
  notes?: string
}

/**
 * Upserts a prospect into the "prospects" table.
 * Fills in defaults for any missing fields.
 * Uses id only if updating; lets DB generate it for new inserts.
 */
export async function upsertProspect(prospect: Partial<ProspectFormData>) {
  const fullProspect: ProspectFormData = {
    name: prospect.name ?? 'Unnamed Prospect',
    number: prospect.number ?? '',
    program_id: prospect.program_id ?? null,
    notes: prospect.notes ?? '',
    created_at: prospect.created_at ?? new Date().toISOString(),
    ...(prospect.id ? { id: prospect.id } : {}), // include id only if present
  }

  const { data, error } = await supabase
    .from('prospects')
    .upsert([fullProspect], { onConflict: 'id' })
    .select()

  if (error) {
    console.error('Error upserting prospect:', error)
    throw error
  }

  return data
}
