import { fetchPersonPackagesByPersonId, PersonPackage } from './fetchpersonpackages'

export interface PersonPackageWithRemaining extends PersonPackage {
  remaining_units: number
}

/**
 * Fetch person_packages for a person that are active and have remaining sessions (used_units < total_units)
 */
export async function fetchPersonPackagesWithRemaining(personId: string): Promise<PersonPackageWithRemaining[]> {
  // Fetch all person_packages for this specific person
  const personPackages = await fetchPersonPackagesByPersonId(personId)
  
  // Filter to only include packages that are:
  // 1. Active status
  // 2. Have remaining sessions (used_units < total_units)
  const activeWithRemaining = personPackages.filter(pp => {
    const isActive = pp.status === 'active'
    const hasRemaining = pp.used_units < pp.total_units
    return isActive && hasRemaining
  })
  
  // Calculate remaining units for each package
  return activeWithRemaining.map(pp => ({
    ...pp,
    remaining_units: pp.total_units - pp.used_units,
  }))
}

