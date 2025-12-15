import { supabase } from '../supabaseClient'

export interface PersonFormData {
  id?: string
  name: string
  number?: string
  notes?: string
  program_id?: string | null
  created_at?: string
  converted_at?: string | null
}

// Re-export types for backward compatibility
export interface ClientFormData extends PersonFormData {}
export interface ProspectFormData extends PersonFormData {}

/**
 * Upserts a person into the "people" table.
 * Fills in defaults for any missing fields.
 * Uses id only if updating; lets DB generate it for new inserts.
 */
export async function upsertPerson(person: Partial<PersonFormData>, options?: {
  asClient?: boolean // if true, sets converted_at to current time; if false, sets to null; if undefined, preserves existing
}): Promise<any> {
  const isNewPerson = !person.id
  const fullPerson: any = {
    name: person.name ?? 'Unnamed Person',
    number: person.number ?? '',
    notes: person.notes ?? '',
    program_id: person.program_id ?? null,
    created_at: person.created_at ?? new Date().toISOString(),
    ...(person.id ? { id: person.id } : {}), // include id only if it exists
  }

  // Handle converted_at based on options
  if (options?.asClient === true) {
    // Set as client (converted_at = current time)
    fullPerson.converted_at = person.converted_at ?? new Date().toISOString()
  } else if (options?.asClient === false) {
    // Set as prospect (converted_at = null)
    fullPerson.converted_at = null
  } else {
    // Preserve existing or use provided value
    if (isNewPerson) {
      // For new persons, default to prospect (null) unless explicitly provided
      fullPerson.converted_at = person.converted_at ?? null
    } else if (person.converted_at !== undefined) {
      // Only update if explicitly provided
      fullPerson.converted_at = person.converted_at
    }
  }

  const { data, error } = await supabase
    .from('people')
    .upsert([fullPerson], { onConflict: 'id' })
    .select()

  if (error) {
    console.error('Error upserting person:', error)
    throw error
  }

  return data
}

/**
 * Upserts a client into the "people" table.
 * Sets converted_at to current time when creating a new client.
 */
export async function upsertClient(client: Partial<ClientFormData>) {
  return upsertPerson(client, { asClient: true })
}

/**
 * Upserts a prospect into the "people" table.
 * Leaves converted_at as null to indicate it's a prospect.
 */
export async function upsertProspect(prospect: Partial<ProspectFormData>) {
  return upsertPerson(prospect, { asClient: false })
}


