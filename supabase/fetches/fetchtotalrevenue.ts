import { supabase } from '../supabaseClient'
import { fetchPersonPackages } from './fetchpersonpackages'
import { DateRangeBounds } from '../utils/daterange'

/**
 * Calculate revenue from payments
 * Sum of all payments within the specified date range
 * If no date range provided, defaults to current month (MTD)
 * Optionally filter by trainer_id (through person_packages)
 */
export async function fetchTotalRevenue(trainerId?: string | null, dateRange?: DateRangeBounds): Promise<number> {
  // Use provided date range or default to current month up to today (MTD)
  let startDate: string
  let endDate: string
  
  if (dateRange) {
    startDate = dateRange.start.toISOString()
    // For current month, cap end date to today (MTD). For historical months, use full month.
    const now = new Date()
    const rangeEnd = new Date(dateRange.end)
    const isCurrentMonth = rangeEnd.getMonth() === now.getMonth() && 
                          rangeEnd.getFullYear() === now.getFullYear()
    
    if (isCurrentMonth) {
      // Current month: use today as end date (MTD)
      endDate = now.toISOString()
    } else {
      // Historical month: use full month
      endDate = dateRange.end.toISOString()
    }
  } else {
    // Default to current month up to today (MTD - Month To Date)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    // Use current date/time, not end of month
    endDate = now.toISOString()
    startDate = startOfMonth.toISOString()
  }
  
  // If trainerId is provided, we need to filter through person_packages
  if (trainerId) {
    // First get person_packages for this trainer
    const personPackages = await fetchPersonPackages(trainerId)
    const personPackageIds = personPackages.map(pp => pp.id)
    
    if (personPackageIds.length === 0) return 0
    
    // Then get payments for those person_packages
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .in('person_package_id', personPackageIds)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
    
    if (error) {
      console.error('Error fetching MTD revenue:', error)
      throw error
    }

    if (!data || data.length === 0) return 0

    // Sum all payment amounts
    const totalRevenue = data.reduce((sum, payment) => {
      const amount = Number(payment.amount) || 0
      if (isNaN(amount)) return sum
      return sum + amount
    }, 0)

    return totalRevenue || 0
  }
  
  // No trainer filter - get all payments
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  if (error) {
    console.error('Error fetching MTD revenue:', error)
    throw error
  }

  if (!data || data.length === 0) return 0

  // Sum all payment amounts
  const totalRevenue = data.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0
    if (isNaN(amount)) return sum
    return sum + amount
  }, 0)

  return totalRevenue || 0
}

