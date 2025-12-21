import { supabase } from '../supabaseClient'
import { fetchSessions } from './fetchsessions'

/**
 * Calculate average bookings per day for a given timeframe
 * Simple calculation: all prospect sessions (KO, SGA, KOFU, Prospect Session) 
 * within the specified time period, divided by the duration in days
 * 
 * @param days - Number of days to look back (7 for week, 30 for month)
 */
export async function fetchAverageBookingsPerDay(days: number): Promise<number> {
  const sessions = await fetchSessions()
  
  // Prospect session types
  const prospectTypes = ['KO', 'SGA', 'KOFU', 'Prospect Session']
  
  // Calculate date range
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0) // Start of day
  
  // Filter for prospect sessions within the timeframe
  // Check created_at to see when the session was created
  const bookingsInTimeframe = sessions.filter(session => {
    // Check if it's a prospect session type
    if (!prospectTypes.includes(session.type)) return false
    
    // Check if created_at is within the timeframe
    const createdAt = new Date(session.created_at)
    if (createdAt < startDate || createdAt > now) return false
    
    return true
  })
  
  if (days === 0) return 0
  
  // Simple calculation: total prospect sessions / number of days
  return bookingsInTimeframe.length / days
}

