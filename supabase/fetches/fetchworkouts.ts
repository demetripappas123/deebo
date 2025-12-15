import { supabase } from '../supabaseClient'

export interface Workout {
  id: string
  created_at: string
  day_id: string | null
  person_id: string
}

/**
 * Fetch all workouts
 */
export async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workouts:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single workout by ID
 */
export async function fetchWorkoutById(workoutId: string): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching workout:', error)
    throw error
  }

  return data
}

/**
 * Fetch workouts for a specific person
 */
export async function fetchPersonWorkouts(personId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching person workouts:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch workouts for a specific day (from a program)
 */
export async function fetchDayWorkouts(dayId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('day_id', dayId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching day workouts:', error)
    throw error
  }

  return data ?? []
}

