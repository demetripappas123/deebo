import { supabase } from '../supabaseClient'
import { Package } from '../fetches/fetchpackages'

export interface PackageFormData {
  id?: string
  name: string
  unit_cost: number
  units_per_cycle: number
  billing_cycle_weeks: number
  session_duration_minutes: number | null
}

/**
 * Create or update a package
 */
export async function upsertPackage(packageData: PackageFormData): Promise<Package> {
  const data: any = {
    name: packageData.name,
    unit_cost: packageData.unit_cost,
    units_per_cycle: packageData.units_per_cycle,
    billing_cycle_weeks: packageData.billing_cycle_weeks,
    session_duration_minutes: packageData.session_duration_minutes ?? null,
  }

  if (packageData.id) {
    // Update existing package
    const { data: updatedPackage, error } = await supabase
      .from('packages')
      .update(data)
      .eq('id', packageData.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating package:', error)
      throw error
    }

    return updatedPackage
  } else {
    // Create new package
    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Error creating package:', error)
      throw error
    }

    return newPackage
  }
}





