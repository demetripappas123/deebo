import { supabase } from '../supabaseClient'
import { fetchPersonPackageById } from '../fetches/fetchpersonpackages'
import { upsertPersonPackage } from './upsertpersonpackage'

/**
 * Increment the used_units for a person_package
 * This should be called when a session is completed
 */
export async function incrementPersonPackageUsedUnits(personPackageId: string): Promise<void> {
  const personPackage = await fetchPersonPackageById(personPackageId)
  
  if (!personPackage) {
    throw new Error(`Person package with id ${personPackageId} not found`)
  }

  // Increment used_units
  const newUsedUnits = personPackage.used_units + 1

  // Update the person_package
  await upsertPersonPackage({
    id: personPackage.id,
    person_id: personPackage.person_id,
    package_id: personPackage.package_id,
    start_date: personPackage.start_date,
    end_date: personPackage.end_date,
    total_units: personPackage.total_units,
    used_units: newUsedUnits,
    status: personPackage.status,
  })
}





