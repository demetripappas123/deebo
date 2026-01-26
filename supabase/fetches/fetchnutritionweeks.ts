'use client'

import { supabase } from '@/supabase/supabaseClient'

export type DayMeal = {
  id: number
  day_id: number
  meal_time: string | null
  sequence: number
  food_id: number | null
  portion_size: number | null
  portion_unit: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  metadata: object | null
  created_at: string
  updated_at: string
}

export type NutritionDay = {
  id: number
  nutrition_week_id: number
  day_of_week: string
  created_at: string
  updated_at: string
  meals: DayMeal[]
}

export type NutritionWeek = {
  id: number
  program_id: string
  week_number: number
  created_at: string
  updated_at: string
  days: NutritionDay[]
}

export async function fetchNutritionWeeks(programId: string): Promise<NutritionWeek[]> {
  try {
    if (!programId) {
      console.error('Invalid programId:', programId)
      return []
    }

    // Fetch weeks first
    const { data: weeksData, error: weeksError } = await supabase
      .from('nutrition_weeks')
      .select('*')
      .eq('program_id', programId)
      .order('week_number', { ascending: true })

    if (weeksError) {
      console.error('fetchNutritionWeeks supabase error (weeks):', weeksError)
      console.error('Error details:', {
        message: weeksError.message,
        details: weeksError.details,
        hint: weeksError.hint,
        code: weeksError.code
      })
      return []
    }

    if (!weeksData || weeksData.length === 0) return []

    // Get all week IDs
    const weekIds = weeksData.map(week => week.id)

    // Fetch all days for these weeks
    const { data: daysData, error: daysError } = await supabase
      .from('nutrition_days')
      .select('*')
      .in('nutrition_week_id', weekIds)
      .order('day_of_week', { ascending: true })

    if (daysError) {
      console.error('fetchNutritionWeeks supabase error (days):', daysError)
      // Continue even if days fetch fails
    }

    // Get all day IDs
    const dayIds = daysData?.map(day => day.id) || []

    // Fetch all meals for these days
    let mealsData: any[] = []
    if (dayIds.length > 0) {
      const { data: meals, error: mealsError } = await supabase
        .from('day_meals')
        .select('*')
        .in('day_id', dayIds)
        .order('sequence', { ascending: true })

      if (mealsError) {
        console.error('fetchNutritionWeeks supabase error (meals):', mealsError)
      } else {
        mealsData = meals || []
      }
    }

    // Group meals by day_id
    const mealsByDayId = new Map<number, DayMeal[]>()
    mealsData.forEach(meal => {
      const dayId = meal.day_id
      if (!mealsByDayId.has(dayId)) {
        mealsByDayId.set(dayId, [])
      }
      mealsByDayId.get(dayId)!.push({
        id: meal.id,
        day_id: meal.day_id,
        meal_time: meal.meal_time,
        sequence: meal.sequence,
        food_id: meal.food_id,
        portion_size: meal.portion_size,
        portion_unit: meal.portion_unit,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        notes: meal.notes,
        metadata: meal.metadata,
        created_at: meal.created_at,
        updated_at: meal.updated_at,
      })
    })

    // Group days by nutrition_week_id
    const daysByWeekId = new Map<number, NutritionDay[]>()
    if (daysData) {
      daysData.forEach(day => {
        const weekId = day.nutrition_week_id
        if (!daysByWeekId.has(weekId)) {
          daysByWeekId.set(weekId, [])
        }
        daysByWeekId.get(weekId)!.push({
          id: day.id,
          nutrition_week_id: day.nutrition_week_id,
          day_of_week: day.day_of_week,
          created_at: day.created_at,
          updated_at: day.updated_at,
          meals: mealsByDayId.get(day.id) || [],
        })
      })
    }

    // Map Supabase response to NutritionWeek[] type
    const weeks: NutritionWeek[] = weeksData.map(week => ({
      id: week.id,
      program_id: week.program_id,
      week_number: week.week_number,
      created_at: week.created_at,
      updated_at: week.updated_at,
      days: daysByWeekId.get(week.id) ?? [],
    }))

    return weeks
  } catch (err) {
    console.error('fetchNutritionWeeks unexpected error:', err)
    return []
  }
}
