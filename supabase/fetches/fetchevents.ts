// supabase/fetches/fetchevents.ts
import { supabase } from '../supabaseClient'

export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  duration_minutes: number
  status: 'past' | 'future' | 'in_progress'
  client_id?: string | null
  prospect_id?: string | null
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('events').select('*')
  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }
  return data ?? []
}
