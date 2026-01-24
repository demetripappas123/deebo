import { supabase } from '../supabaseClient'
import { fetchPersonPackages } from './fetchpersonpackages'
import { DateRange } from '../utils/daterange'

export interface HistoricalRevenuePoint {
  date: string // ISO date string
  revenue: number
  label: string // Display label (e.g., "Week 1", "Jan", "Day 1")
}

/**
 * Fetch historical revenue data points for a given date range type
 * Returns data points for:
 * - Weekly: past 4 weeks
 * - Daily (today/yesterday): past 7 days
 * - Monthly: past 3 months
 * - EOM Projected: always past 3 months
 */
export async function fetchHistoricalRevenue(
  trainerId?: string | null,
  dateRange: DateRange = 'monthly',
  revenueType: 'revenue' | 'trained' | 'projected' = 'revenue'
): Promise<HistoricalRevenuePoint[]> {
  const now = new Date()
  let periods: { start: Date; end: Date; label: string }[] = []

  // Determine periods based on date range and revenue type
  if (revenueType === 'projected') {
    // EOM Projected always uses past 3 months
    for (let i = 2; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(month.getFullYear(), month.getMonth(), 1)
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)
      periods.push({
        start,
        end,
        label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      })
    }
  } else if (dateRange === 'weekly') {
    // Past 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      periods.push({
        start: weekStart,
        end: weekEnd,
        label: `Week ${4 - i}`,
      })
    }
  } else if (dateRange === 'today' || dateRange === 'yesterday') {
    // Past 7 days
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      periods.push({
        start: day,
        end: dayEnd,
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }
  } else {
    // Monthly: past 3 months
    for (let i = 2; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(month.getFullYear(), month.getMonth(), 1)
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)
      periods.push({
        start,
        end,
        label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      })
    }
  }

  // Pre-fetch person_packages once if trainerId is provided (for optimization)
  // Needed for both 'revenue' and 'projected' since projected now shows actual revenue
  let personPackageIds: string[] = []
  if (trainerId && (revenueType === 'revenue' || revenueType === 'projected')) {
    const personPackages = await fetchPersonPackages(trainerId)
    personPackageIds = personPackages.map(pp => pp.id)
  }

  // Fetch revenue for each period in parallel
  const revenuePromises = periods.map(async (period) => {
    if (revenueType === 'revenue') {
      return await fetchRevenueForPeriod(trainerId, period.start, period.end, personPackageIds)
    } else if (revenueType === 'trained') {
      return await fetchTrainedRevenueForPeriod(trainerId, period.start, period.end)
    } else {
      // For projected revenue, show actual revenue (payments) for past months
      // This allows comparison of current projection against actual historical revenue
      return await fetchRevenueForPeriod(trainerId, period.start, period.end, personPackageIds)
    }
  })

  const revenues = await Promise.all(revenuePromises)

  return periods.map((period, index) => ({
    date: period.start.toISOString(),
    revenue: revenues[index],
    label: period.label,
  }))
}

/**
 * Fetch revenue from payments for a specific date range
 * personPackageIds can be pre-fetched for optimization
 */
async function fetchRevenueForPeriod(
  trainerId: string | null | undefined,
  startDate: Date,
  endDate: Date,
  personPackageIds?: string[]
): Promise<number> {
  const startDateStr = startDate.toISOString()
  const endDateStr = endDate.toISOString()

  if (trainerId) {
    // Use pre-fetched personPackageIds if provided, otherwise fetch them
    let packageIds = personPackageIds
    if (!packageIds || packageIds.length === 0) {
      const personPackages = await fetchPersonPackages(trainerId)
      packageIds = personPackages.map(pp => pp.id)
    }

    if (packageIds.length === 0) return 0

    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .in('person_package_id', packageIds)
      .gte('payment_date', startDateStr)
      .lte('payment_date', endDateStr)

    if (error) {
      console.error('Error fetching revenue for period:', error)
      return 0
    }

    if (!data || data.length === 0) return 0

    return data.reduce((sum, payment) => {
      const amount = Number(payment.amount) || 0
      return isNaN(amount) ? sum : sum + amount
    }, 0)
  }

  // No trainer filter
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', startDateStr)
    .lte('payment_date', endDateStr)

  if (error) {
    console.error('Error fetching revenue for period:', error)
    return 0
  }

  if (!data || data.length === 0) return 0

  return data.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0
    return isNaN(amount) ? sum : sum + amount
  }, 0)
}

/**
 * Fetch trained revenue for a specific date range
 */
async function fetchTrainedRevenueForPeriod(
  trainerId: string | null | undefined,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Import here to avoid circular dependencies
  const { fetchSessions } = await import('./fetchsessions')
  const { fetchPersonPackages } = await import('./fetchpersonpackages')
  const { fetchPackages } = await import('./fetchpackages')

  // Batch fetch in parallel
  const [sessions, personPackages, packages] = await Promise.all([
    fetchSessions(trainerId),
    fetchPersonPackages(trainerId),
    fetchPackages(),
  ])

  // Filter for completed client sessions only, within date range
  let clientSessions = sessions.filter(
    (s) =>
      s.type === 'Client Session' &&
      s.status === 'completed' &&
      s.person_package_id !== null &&
      s.person_package_id !== undefined
  )

  // Filter by date range (use started_at or end_time, prefer started_at)
  clientSessions = clientSessions.filter((s) => {
    const sessionDate = s.started_at
      ? new Date(s.started_at)
      : s.end_time
      ? new Date(s.end_time)
      : null
    if (!sessionDate) return false
    return sessionDate >= startDate && sessionDate <= endDate
  })

  if (clientSessions.length === 0) return 0

  // Create lookup maps
  const personPackageMap = new Map(personPackages.map((pp) => [pp.id, pp]))
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]))

  let totalTrainedRevenue = 0

  // Calculate revenue for each client session
  clientSessions.forEach((session) => {
    if (!session.person_package_id) return

    const personPackage = personPackageMap.get(session.person_package_id)
    if (!personPackage) return

    const pkg = packageMap.get(personPackage.package_id)
    if (!pkg) return

    const unitCost = Number(pkg.unit_cost) || 0
    if (isNaN(unitCost) || unitCost <= 0) return

    totalTrainedRevenue += unitCost
  })

  return totalTrainedRevenue || 0
}

