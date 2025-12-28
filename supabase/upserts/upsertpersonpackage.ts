import { supabase } from '../supabaseClient'

export interface PersonPackageFormData {
  id?: string
  person_id: string
  package_id: string
  start_date: string // ISO date string
  end_date: string // ISO date string
  total_units: number
  used_units?: number
  status?: string
}

/**
 * Create or update a person_package relationship
 */
export async function upsertPersonPackage(
  personPackage: PersonPackageFormData
): Promise<any> {
  const data: any = {
    person_id: personPackage.person_id,
    package_id: personPackage.package_id,
    start_date: personPackage.start_date,
    end_date: personPackage.end_date,
    total_units: personPackage.total_units,
    used_units: personPackage.used_units ?? 0,
    status: personPackage.status ?? 'active',
  }

  if (personPackage.id) {
    // Update existing person_package
    const { data: updated, error } = await supabase
      .from('person_packages')
      .update(data)
      .eq('id', personPackage.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating person_package:', error)
      throw error
    }

    return updated
  } else {
    // Create new person_package
    const { data: created, error } = await supabase
      .from('person_packages')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Error creating person_package:', error)
      throw error
    }

    return created
  }
}





