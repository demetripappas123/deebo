'use client'

import { supabase } from '@/supabase/supabaseClient'

export type Day = {
  id: string
  name: string
  // Add sessions or workouts later if needed
  sessions?: any[]
}

export type Week = {
  id: string
  program_id: string
  number: number
  days: Day[]
}

export async function fetchWeeks(programId: string): Promise<Week[]> {
  try {
    // Fetch weeks first
    const { data: weeksData, error: weeksError } = await supabase
      .from('program_weeks')
      .select('*')
      .eq('program_id', programId)
      .order('number', { ascending: true })

    if (weeksError) {
      console.error('fetchWeeks supabase error (weeks):', weeksError)
      console.error('Error details:', {
        message: weeksError.message,
        details: weeksError.details,
        hint: weeksError.hint,
        code: weeksError.code
      })
      return [] // return empty array if fetch fails
    }

    if (!weeksData || weeksData.length === 0) return []

    // Get all week IDs
    const weekIds = weeksData.map(week => week.id)

    // Fetch all days for these weeks
    const { data: daysData, error: daysError } = await supabase
      .from('program_days')
      .select('*')
      .in('week_id', weekIds)
      .order('week_id', { ascending: true })

    if (daysError) {
      console.error('fetchWeeks supabase error (days):', daysError)
      console.error('Error details:', {
        message: daysError.message,
        details: daysError.details,
        hint: daysError.hint,
        code: daysError.code
      })
      // Continue even if days fetch fails, just return weeks with empty days arrays
    }

    // Group days by week_id
    const daysByWeekId = new Map<string, Day[]>()
    if (daysData) {
      daysData.forEach(day => {
        const weekId = day.week_id
        if (!daysByWeekId.has(weekId)) {
          daysByWeekId.set(weekId, [])
        }
        daysByWeekId.get(weekId)!.push({
          id: day.id,
          name: day.name,
          sessions: day.sessions
        })
      })
    }

    // Map Supabase response to Week[] type
    const weeks: Week[] = weeksData.map(week => ({
      id: week.id,
      program_id: week.program_id,
      number: week.number,
      days: daysByWeekId.get(week.id) ?? [], // ensure days is always an array
    }))

    return weeks
  } catch (err) {
    console.error('fetchWeeks unexpected error:', err)
    return [] // safely return empty array
  }
}
