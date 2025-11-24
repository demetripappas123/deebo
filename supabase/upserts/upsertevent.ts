// lib/events.ts
import { supabase } from '../supabaseClient'

export type EventFormData = {
  id?: string               // optional, for updating
  title: string
  type: string
  client_id?: string | null
  prospect_id?: string | null
  start_time: string
  duration_minutes: number
  status?: 'past' | 'future' | 'in_progress'
  created_at?: string       // optional, defaults to now() in DB
}

/**
 * Upserts an event into the "events" table.
 * Fills in defaults for missing fields and only includes id if updating.
 */
export async function upsertEvent(event: Partial<EventFormData>) {
  const fullEvent: EventFormData = {
    title: event.title ?? 'Untitled Event',
    type: event.type ?? 'Client Session',
    client_id: event.client_id ?? null,
    prospect_id: event.prospect_id ?? null,
    start_time: event.start_time ?? new Date().toISOString(),
    duration_minutes: event.duration_minutes ?? 60,
    status: event.status ?? 'future',
    created_at: event.created_at ?? new Date().toISOString(),
    ...(event.id ? { id: event.id } : {}), // include id only if present
  }

  const { data, error } = await supabase
    .from('events')
    .upsert([fullEvent], { onConflict: 'id' })
    .select()

  if (error) {
    console.error('Error upserting event:', error)
    throw error
  }

  return data
}
