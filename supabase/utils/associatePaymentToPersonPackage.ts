import { supabase } from '../supabaseClient'
import { upsertPersonPackage, PersonPackageFormData } from '../upserts/upsertpersonpackage'
import { fetchPersonPackagesByPersonId } from '../fetches/fetchpersonpackages'
import { fetchPackageById } from '../fetches/fetchpackages'

/**
 * Associates a payment with a person_package based on payment date
 * - If a person_package exists in the date range with status "pending", associates payment and activates it
 * - If a person_package exists in the date range with status "active", creates next period and associates payment
 * Returns the person_package_id that was associated
 */
export async function associatePaymentToPersonPackage(
  personId: string,
  paymentDate: string,
  amount: number
): Promise<string | null> {
  // Convert payment date to Date object
  const paymentDateObj = new Date(paymentDate)

  // Fetch all person_packages for this person
  const personPackages = await fetchPersonPackagesByPersonId(personId)

  // Find person_package where payment date falls within start_date and end_date
  const matchingPackage = personPackages.find((pp) => {
    const startDate = new Date(pp.start_date)
    startDate.setHours(0, 0, 0, 0) // Normalize to start of day
    const endDate = new Date(pp.end_date)
    endDate.setHours(23, 59, 59, 999) // Normalize to end of day
    paymentDateObj.setHours(0, 0, 0, 0) // Normalize payment date
    return paymentDateObj >= startDate && paymentDateObj <= endDate
  })

  if (matchingPackage) {
    if (matchingPackage.status === 'pending') {
      // Update person_package status to active
      await upsertPersonPackage({
        id: matchingPackage.id,
        person_id: matchingPackage.person_id,
        package_id: matchingPackage.package_id,
        start_date: matchingPackage.start_date,
        end_date: matchingPackage.end_date,
        total_units: matchingPackage.total_units,
        used_units: matchingPackage.used_units,
        status: 'active',
      })

      return matchingPackage.id
    } else if (matchingPackage.status === 'active') {
      // Create next billing period
      const packageData = await fetchPackageById(matchingPackage.package_id)
      if (!packageData) {
        throw new Error('Package not found')
      }

      // Calculate next period dates
      const currentEndDate = new Date(matchingPackage.end_date)
      const nextStartDate = new Date(currentEndDate)
      nextStartDate.setDate(nextStartDate.getDate() + 1) // Start the day after current period ends
      
      const nextEndDate = new Date(nextStartDate)
      nextEndDate.setDate(nextEndDate.getDate() + (packageData.billing_cycle_weeks * 7))

      // Create new person_package for next period
      const newPersonPackage = await upsertPersonPackage({
        person_id: matchingPackage.person_id,
        package_id: matchingPackage.package_id,
        start_date: nextStartDate.toISOString().split('T')[0],
        end_date: nextEndDate.toISOString().split('T')[0],
        total_units: packageData.units_per_cycle,
        used_units: 0,
        status: 'active',
      })

      return newPersonPackage.id
    }
  }

  // If no matching package found, return null (payment won't be associated)
  return null
}

