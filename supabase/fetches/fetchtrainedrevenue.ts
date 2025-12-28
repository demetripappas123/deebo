import { supabase } from '../supabaseClient'
import { fetchSessions } from './fetchsessions'
import { fetchPersonPackages } from './fetchpersonpackages'
import { fetchPackages } from './fetchpackages'

/**
 * Calculate trained revenue
 * For all client sessions:
 * 1. Get person_package_id from each session
 * 2. Use person_package_id to find the corresponding person_package
 * 3. Get package_id from person_package
 * 4. Get unit_cost from package
 * 5. Sum all unit_costs
 * If person_package_id is null, add 0 for that session
 */
export async function fetchTrainedRevenue(trainerId?: string | null): Promise<number> {
  // Fetch all client sessions
  const sessions = await fetchSessions(trainerId)
  const clientSessions = sessions.filter(s => s.type === 'Client Session')
  
  if (clientSessions.length === 0) return 0
  
  // Fetch all person_packages and packages to create lookup maps
  const personPackages = await fetchPersonPackages(trainerId)
  const packages = await fetchPackages()
  
  // Create lookup maps
  const personPackageMap = new Map(personPackages.map(pp => [pp.id, pp]))
  const packageMap = new Map(packages.map(pkg => [pkg.id, pkg]))
  
  let totalTrainedRevenue = 0
  
  // Calculate revenue for each client session
  clientSessions.forEach(session => {
    // If person_package_id is null, add 0
    if (!session.person_package_id) {
      return // Skip this session (adds 0)
    }
    
    // Get person_package
    const personPackage = personPackageMap.get(session.person_package_id)
    if (!personPackage) {
      console.warn(`Person package ${session.person_package_id} not found for session ${session.id}`)
      return // Skip this session (adds 0)
    }
    
    // Get package
    const pkg = packageMap.get(personPackage.package_id)
    if (!pkg) {
      console.warn(`Package ${personPackage.package_id} not found for person_package ${session.person_package_id}`)
      return // Skip this session (adds 0)
    }
    
    // Get unit_cost
    const unitCost = Number(pkg.unit_cost) || 0
    if (isNaN(unitCost) || unitCost <= 0) {
      console.warn(`Invalid unit_cost for package ${pkg.id}: ${pkg.unit_cost}`)
      return // Skip this session (adds 0)
    }
    
    // Add unit_cost to total
    totalTrainedRevenue += unitCost
  })
  
  return totalTrainedRevenue || 0
}

