import { supabase } from '../supabaseClient'
import { fetchPeople } from './fetchpeople'
import { fetchSessions } from './fetchsessions'
import { fetchPayments } from './fetchpayments'
import { calculateProspectSessionCloseRate, calculateProspectSessionShowRate } from './fetchprospectsessions'
import { fetchTotalRevenue } from './fetchtotalrevenue'
import { fetchTrainedRevenue } from './fetchtrainedrevenue'
import { fetchProjectedRevenue } from './fetchprojectedrevenue'

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
async function calculateAverageBookings(): Promise<number> {
  const sessions = await fetchSessions()
  
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
async function calculateRevenue(): Promise<number> {
  const payments = await fetchPayments()
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
}

/**
 * Calculate hourly average: revenue per hour based on completed sessions
 */
async function calculateHourlyAverage(): Promise<number> {
  const sessions = await fetchSessions()
  const completedSessions = sessions.filter(s => 
    s.status === 'completed' && s.started_at && s.end_time
  )
  
  if (completedSessions.length === 0) return 0
  
  // Calculate total hours
  let totalHours = 0
  completedSessions.forEach(session => {
    if (session.started_at && session.end_time) {
      const start = new Date(session.started_at).getTime()
      const end = new Date(session.end_time).getTime()
      const hours = (end - start) / (1000 * 60 * 60)
      if (hours > 0) {
        totalHours += hours
      }
    }
  })
  
  if (totalHours === 0) return 0
  
  // Get revenue for the period
  const revenue = await calculateRevenue()
  
  // Calculate average revenue per hour
  return revenue / totalHours
}

/**
 * Fetch all dashboard metrics
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [closeRate, showRate, averageBookings, revenue, trainedRevenue, hourlyAverage, mtdRevenue, projectedRevenue] = await Promise.all([
    calculateCloseRate(),
    calculateShowRate(),
    calculateAverageBookings(),
    calculateRevenue(),
    fetchTrainedRevenue(), // Trained Revenue
    calculateHourlyAverage(),
    fetchTotalRevenue(), // MTD Revenue
    fetchProjectedRevenue(), // Projected Revenue
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

