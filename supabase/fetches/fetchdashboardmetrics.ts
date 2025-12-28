import { supabase } from '../supabaseClient'
import { fetchPeople } from './fetchpeople'
import { fetchSessions } from './fetchsessions'
import { fetchPayments } from './fetchpayments'
import { calculateProspectSessionCloseRate, calculateProspectSessionShowRate } from './fetchprospectsessions'
import { fetchTotalRevenue } from './fetchtotalrevenue'
import { fetchTrainedRevenue } from './fetchtrainedrevenue'
import { fetchProjectedRevenue } from './fetchprojectedrevenue'
import { fetchPersonPackages } from './fetchpersonpackages'
import { fetchPackages } from './fetchpackages'

export interface DashboardMetrics {
  closeRate: number // Percentage of prospect sessions that were converted
  showRate: number // Percentage of prospect sessions that were completed (completed / (completed + cancelled))
  averageBookings: number // Total number of non-client sessions scheduled today
  revenue: number // Total revenue from payments (deprecated - use trainedRevenue)
  trainedRevenue: number // Revenue from client sessions (sum of unit costs)
  hourlyAverage: number // Average revenue per hour
  mtdRevenue: number // Month To Date revenue
  projectedRevenue: number // Projected monthly revenue
}

/**
 * Calculate close rate: prospect sessions with converted == true / total prospect sessions
 * Prospect sessions are: KO, SGA, KOFU, Prospect Session
 */
async function calculateCloseRate(): Promise<number> {
  return await calculateProspectSessionCloseRate()
}

/**
 * Calculate show rate: completed prospect sessions / (completed + cancelled prospect sessions)
 * Only considers prospect sessions: KO, SGA, KOFU, Prospect Session
 */
async function calculateShowRate(): Promise<number> {
  return await calculateProspectSessionShowRate()
}

/**
 * Calculate today's bookings: total number of non-client sessions scheduled today
 * Non-client sessions: KO, SGA, KOFU, Prospect Session
 * Must have start_time (scheduled) and created_at date of today
 */
async function calculateAverageBookings(trainerId?: string | null): Promise<number> {
  const sessions = await fetchSessions(trainerId)
  
  // Non-client session types
  const nonClientTypes = ['KO', 'SGA', 'KOFU', 'Prospect Session']
  
  // Get today's date range (start and end of today)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  // Filter for non-client sessions that:
  // 1. Are non-client types
  // 2. Have a start_time (scheduled)
  // 3. Have created_at date of today
  const todayBookings = sessions.filter(session => {
    // Check if it's a non-client session type
    if (!nonClientTypes.includes(session.type)) return false
    
    // Check if it has a start_time (scheduled)
    if (!session.start_time) return false
    
    // Check if created_at is today
    const createdAt = new Date(session.created_at)
    if (createdAt < startOfToday || createdAt > endOfToday) return false
    
    return true
  })
  
  return todayBookings.length
}

/**
 * Calculate total revenue from payments
 */
async function calculateRevenue(trainerId?: string | null): Promise<number> {
  const payments = await fetchPayments(trainerId)
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
}

/**
 * Calculate hourly average: average hourly rate across all client sessions
 * For client sessions with status "completed" or "cancelled_with_charge":
 * 1. Find the associated package and unit cost
 * 2. Calculate hours for the session (from started_at to end_time, usually 1 or 0.5)
 * 3. Calculate hourly rate for that session = unit_cost / hours
 * 4. Average all session hourly rates
 */
async function calculateHourlyAverage(trainerId?: string | null): Promise<number> {
  const sessions = await fetchSessions(trainerId)
  
  console.log('calculateHourlyAverage - Total sessions:', sessions.length)
  console.log('calculateHourlyAverage - Trainer ID:', trainerId)
  
  // Filter for client sessions with status "completed" or "cancelled_with_charge" that have a package
  // Must have person_package_id to calculate hourly rate
  // Note: We use package.session_duration_minutes instead of calculating from started_at/end_time
  const relevantSessions = sessions.filter(s => 
    s.type === 'Client Session' && 
    (s.status === 'completed' || s.status === 'cancelled_with_charge') &&
    s.person_package_id !== null && 
    s.person_package_id !== undefined
  )
  
  console.log('calculateHourlyAverage - Relevant sessions (with package and status):', relevantSessions.length)
  
  if (relevantSessions.length === 0) {
    console.log('calculateHourlyAverage - No relevant sessions found')
    return 0
  }
  
  // Fetch person packages and packages for lookup
  const personPackages = await fetchPersonPackages(trainerId)
  const packages = await fetchPackages()
  
  console.log('calculateHourlyAverage - Person packages:', personPackages.length)
  console.log('calculateHourlyAverage - Packages:', packages.length)
  
  const personPackageMap = new Map(personPackages.map(pp => [pp.id, pp]))
  const packageMap = new Map(packages.map(pkg => [pkg.id, pkg]))
  
  const hourlyRates: number[] = []
  let skippedCount = 0
  
  // Calculate hourly rate for each session
  relevantSessions.forEach(session => {
    // Double-check that person_package_id exists (should be guaranteed by filter, but safety check)
    if (!session.person_package_id) return
    
    // Get person_package
    const personPackage = personPackageMap.get(session.person_package_id)
    if (!personPackage) {
      console.warn(`[Hourly Rate] Person package ${session.person_package_id} not found for session ${session.id}`)
      skippedCount++
      return // Skip if package not found
    }
    
    // Get package
    const pkg = packageMap.get(personPackage.package_id)
    if (!pkg) {
      console.warn(`[Hourly Rate] Package ${personPackage.package_id} not found for person_package ${session.person_package_id}`)
      skippedCount++
      return // Skip if package not found
    }
    
    // Get unit_cost
    const unitCost = Number(pkg.unit_cost) || 0
    if (isNaN(unitCost) || unitCost <= 0) {
      console.warn(`[Hourly Rate] Invalid unit_cost ${pkg.unit_cost} for package ${pkg.id}`)
      skippedCount++
      return // Skip if invalid unit cost
    }
    
    // Use session duration from package (in minutes), convert to hours
    const sessionDurationMinutes = pkg.session_duration_minutes
    if (!sessionDurationMinutes || sessionDurationMinutes <= 0 || isNaN(sessionDurationMinutes)) {
      console.warn(`[Hourly Rate] Invalid session_duration_minutes ${sessionDurationMinutes} for package ${pkg.id}`)
      skippedCount++
      return // Skip if invalid duration
    }
    
    const hours = sessionDurationMinutes / 60 // Convert minutes to hours
    
    // Calculate hourly rate for this session
    const hourlyRate = unitCost / hours
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      console.warn(`[Hourly Rate] Invalid hourly rate calculated for session ${session.id}: unitCost=${unitCost}, hours=${hours}, rate=${hourlyRate}`)
      skippedCount++
      return // Skip if invalid hourly rate
    }
    
    console.log(`[Hourly Rate] Session ${session.id}: unitCost=${unitCost}, duration=${sessionDurationMinutes}min (${hours.toFixed(2)}h), rate=${hourlyRate.toFixed(2)}`)
    hourlyRates.push(hourlyRate)
  })
  
  console.log(`[Hourly Rate] Valid hourly rates: ${hourlyRates.length}, Skipped: ${skippedCount}`)
  
  if (hourlyRates.length === 0) {
    console.warn('[Hourly Rate] No valid hourly rates calculated - all sessions were filtered out')
    return 0
  }
  
  // Average all session hourly rates
  const sum = hourlyRates.reduce((acc, rate) => acc + rate, 0)
  const average = sum / hourlyRates.length
  console.log(`[Hourly Rate] Final average: ${average.toFixed(2)}`)
  return average
}

/**
 * Fetch all dashboard metrics
 * Optionally filter by trainer_id
 */
export async function fetchDashboardMetrics(trainerId?: string | null): Promise<DashboardMetrics> {
  const [closeRate, showRate, averageBookings, revenue, trainedRevenue, hourlyAverage, mtdRevenue, projectedRevenue] = await Promise.all([
    calculateCloseRate(),
    calculateShowRate(),
    calculateAverageBookings(trainerId),
    calculateRevenue(trainerId),
    fetchTrainedRevenue(trainerId), // Trained Revenue
    calculateHourlyAverage(trainerId),
    fetchTotalRevenue(trainerId), // MTD Revenue
    fetchProjectedRevenue(trainerId), // Projected Revenue
  ])
  
  return {
    closeRate: Math.round(closeRate * 100) / 100, // Round to 2 decimal places
    showRate: Math.round(showRate * 100) / 100,
    averageBookings: Math.round(averageBookings), // Round to whole number for count
    revenue: Math.round(revenue * 100) / 100,
    trainedRevenue: Math.round(trainedRevenue * 100) / 100,
    hourlyAverage: Math.round(hourlyAverage * 100) / 100,
    mtdRevenue: Math.round(mtdRevenue * 100) / 100,
    projectedRevenue: Math.round(projectedRevenue * 100) / 100,
  }
}

