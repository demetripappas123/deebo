import { supabase } from '../supabaseClient'
import { Session, SessionType } from './fetchsessions'

/**
 * Fetch all prospect sessions (KO, SGA, KOFU, Prospect Session)
 */
export async function fetchProspectSessions(): Promise<Session[]> {
  const prospectTypes: SessionType[] = ['KO', 'SGA', 'KOFU', 'Prospect Session']
  
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .in('type', prospectTypes)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching prospect sessions:', error)
    throw error
  }

  return data ?? []
}

/**
 * Calculate close rate based on prospect sessions
 * Close rate = (completed sessions with converted == true) / (completed prospect sessions) * 100
 * Only considers completed prospect sessions
 */
export async function calculateProspectSessionCloseRate(): Promise<number> {
  const prospectSessions = await fetchProspectSessions()
  
  // Filter for completed sessions only
  const completedSessions = prospectSessions.filter(s => s.status === 'completed')
  
  if (completedSessions.length === 0) return 0
  
  const convertedSessions = completedSessions.filter(s => s.converted === true).length
  const totalCompletedSessions = completedSessions.length
  
  return (convertedSessions / totalCompletedSessions) * 100
}

/**
 * Calculate show rate based on prospect sessions
 * Show rate = completed sessions / (completed + cancelled sessions) * 100
 * Only considers prospect sessions: KO, SGA, KOFU, Prospect Session
 */
export async function calculateProspectSessionShowRate(): Promise<number> {
  const prospectSessions = await fetchProspectSessions()
  
  // Filter for completed sessions
  const completedSessions = prospectSessions.filter(s => s.status === 'completed')
  
  // Filter for cancelled sessions (with or without charge)
  const cancelledSessions = prospectSessions.filter(s => 
    s.status === 'canceled_with_charge' || s.status === 'canceled_no_charge'
  )
  
  const totalRelevantSessions = completedSessions.length + cancelledSessions.length
  
  if (totalRelevantSessions === 0) return 0
  
  return (completedSessions.length / totalRelevantSessions) * 100
}

