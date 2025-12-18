import { supabase } from '../supabaseClient'

export interface Package {
  id: string
  name: string
  units_per_cycle: number
  unit_cost: number
  billing_cycle_weeks: number
  session_duration_minutes: number | null
  created_at: string
}

/**
 * Fetch all packages
 */
export async function fetchPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching packages:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single package by ID
 */
export async function fetchPackageById(packageId: string): Promise<Package | null> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching package:', error)
    throw error
  }

  return data
}

