import { supabase } from '../supabaseClient'
import { fetchPeople } from './fetchpeople'
import { fetchContractsByPersonId, Contract } from './fetchcontracts'
import { fetchPersonPackagesByPersonId, PersonPackage } from './fetchpersonpackages'
import { fetchPackages, Package } from './fetchpackages'
import { fetchPaymentsByPersonId, Payment } from './fetchpayments'

/**
 * Calculate Monthly Recurring Revenue (MRR) / Projected Revenue
 * For each client:
 * 1. Find their active contract and verify it's active throughout the rest of the month
 * 2. Use package billing cycle length and person_packages (pending and completed cycles) 
 *    to determine expected payments for the remainder of the month
 * 3. Include past payments for the current month when applicable
 * 4. Sum all clients to estimate total MRR
 */
export async function fetchProjectedRevenue(trainerId?: string | null): Promise<number> {
  // Get current date info
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const daysRemainingInMonth = endOfMonth.getDate() - now.getDate() + 1
  const totalDaysInMonth = endOfMonth.getDate()

  // Batch fetch clients and packages in parallel
  const [clients, packages] = await Promise.all([
    fetchPeople({ isClient: true, trainerId }),
    fetchPackages(),
  ])
  
  if (clients.length === 0) return 0
  if (packages.length === 0) return 0
  const packageMap = new Map(packages.map(pkg => [pkg.id, pkg]))

  let totalMRR = 0

  // Process each client
  for (const client of clients) {
    try {
      // Batch fetch contract, person packages, and payments for this client in parallel
      const [contracts, personPackages, allPayments] = await Promise.all([
        fetchContractsByPersonId(client.id),
        fetchPersonPackagesByPersonId(client.id),
        fetchPaymentsByPersonId(client.id),
      ])
      
      const activeContract = contracts.find(c => c.status === 'active')
      
      if (!activeContract) {
        // No active contract, skip this client
        continue
      }

      // Verify contract is active throughout the rest of the month
      // (Contract should not be cancelled/frozen, and if it has an end date, it should be after end of month)
      // For now, we just check status = 'active'
      
      // Get package details
      const pkg = packageMap.get(activeContract.package_id)
      if (!pkg) {
        console.warn(`Package ${activeContract.package_id} not found for client ${client.id}`)
        continue
      }

      const billingCycleWeeks = Number(pkg.billing_cycle_weeks) || 0
      const unitCost = Number(pkg.unit_cost) || 0
      const unitsPerCycle = Number(pkg.units_per_cycle) || 0

      if (billingCycleWeeks === 0 || isNaN(billingCycleWeeks) || isNaN(unitCost) || isNaN(unitsPerCycle)) {
        console.warn(`Invalid package data for client ${client.id}`)
        continue
      }
      const paymentsThisMonth = allPayments.filter(payment => {
        const paymentDate = new Date(payment.payment_date)
        return paymentDate >= startOfMonth && paymentDate <= endOfMonth
      })

      // Calculate payment amount per cycle
      const paymentPerCycle = unitCost * unitsPerCycle

      // Get person_packages that overlap with current month
      const personPackagesInMonth = personPackages.filter(pp => {
        const ppStart = new Date(pp.start_date)
        const ppEnd = new Date(pp.end_date)
        // Include if it overlaps with current month
        return ppStart <= endOfMonth && ppEnd >= startOfMonth
      })

      // Calculate expected revenue for remainder of month
      let expectedRevenue = 0

      // Add payments already made this month
      const paymentsMadeThisMonth = paymentsThisMonth.reduce((sum, payment) => {
        return sum + (Number(payment.amount) || 0)
      }, 0)
      expectedRevenue += paymentsMadeThisMonth

      // Find pending person_packages that overlap with current month
      const pendingInMonth = personPackagesInMonth.filter(pp => pp.status === 'pending')
      
      // Find active person_packages that overlap with current month
      const activeInMonth = personPackagesInMonth.filter(pp => pp.status === 'active')

      // Calculate expected payments for remainder of month
      if (pendingInMonth.length > 0) {
        // If there are pending cycles in the current month, expect payment for those
        expectedRevenue += pendingInMonth.length * paymentPerCycle
      } else if (activeInMonth.length > 0) {
        // If there are active cycles, check if we need to create next cycle for remainder
        // Get the latest active person_package
        const latestActive = activeInMonth.sort((a, b) => {
          return new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        })[0]

        const latestEndDate = new Date(latestActive.end_date)
        
        // If the latest active cycle ends before end of month, calculate cycles needed
        if (latestEndDate < endOfMonth) {
          const billingCycleDays = billingCycleWeeks * 7
          const daysFromLatestEnd = Math.max(0, (endOfMonth.getTime() - latestEndDate.getTime()) / (1000 * 60 * 60 * 24))
          const cyclesNeeded = Math.ceil(daysFromLatestEnd / billingCycleDays)
          
          if (cyclesNeeded > 0) {
            expectedRevenue += cyclesNeeded * paymentPerCycle
          }
        }
      } else {
        // No person_packages in current month - calculate based on billing cycle frequency
        const billingCycleDays = billingCycleWeeks * 7
        const cyclesInRemainder = daysRemainingInMonth / billingCycleDays
        
        if (cyclesInRemainder > 0) {
          expectedRevenue += cyclesInRemainder * paymentPerCycle
        }
      }

      // Add to total MRR
      if (!isNaN(expectedRevenue) && isFinite(expectedRevenue) && expectedRevenue > 0) {
        totalMRR += expectedRevenue
      }
    } catch (err) {
      console.error(`Error calculating MRR for client ${client.id}:`, err)
      // Continue with next client
    }
  }

  return totalMRR || 0
}

