import { supabase } from '../supabaseClient'

export interface PersonPackage {
  id: string
  person_id: string
  package_id: string
  start_date: string
  end_date: string
  total_units: number
  used_units: number
  status: string
  created_at: string
}

/**
 * Fetch all person_packages
 * Optionally filter by trainer_id
 */
export async function fetchPersonPackages(trainerId?: string | null): Promise<PersonPackage[]> {
  let query = supabase
    .from('person_packages')
    .select('*')
    .order('created_at', { ascending: false })

  if (trainerId) {
    query = query.eq('trainer_id', trainerId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching person_packages:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch person_packages for a specific person
 */
export async function fetchPersonPackagesByPersonId(personId: string): Promise<PersonPackage[]> {
  const { data, error } = await supabase
    .from('person_packages')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching person_packages by person:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single person_package by ID
 */
export async function fetchPersonPackageById(personPackageId: string): Promise<PersonPackage | null> {
  const { data, error } = await supabase
    .from('person_packages')
    .select('*')
    .eq('id', personPackageId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching person_package:', error)
    throw error
  }

  return data
}





