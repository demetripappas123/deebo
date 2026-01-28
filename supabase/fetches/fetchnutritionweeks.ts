'use client'

import { supabase } from '@/supabase/supabaseClient'
import { fetchDayMealFoods, DayMealFood } from './fetchdaymealfoods'

export type DayMeal = {
  id: string // uuid
  name: string | null
  meal_template_id: string | null
  nutrition_day: string // uuid, references nutrition_days.id
  meal_time: string | null // timestamp
  meal_number: number | null
  created_at: string
  updated_at: string
  foods: DayMealFood[] // Foods from meals_foods_programmed table
}

// DayMealFood is imported from fetchdaymealfoods.ts

export type NutritionDay = {
  id: string // uuid (since day_meals.nutrition_day references this)
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
      .order('"day of week"', { ascending: true })

    if (daysError) {
      console.error('fetchNutritionWeeks supabase error (days):', daysError)
      // Continue even if days fetch fails
    }

    // Get all day IDs (these are now uuid strings)
    const dayIds = daysData?.map(day => day.id) || []

    // Fetch all meals for these days
    let mealsData: any[] = []
    if (dayIds.length > 0) {
      const { data: meals, error: mealsError } = await supabase
        .from('day_meals')
        .select('*')
        .in('nutrition_day', dayIds)
        .order('meal_number', { ascending: true, nullsFirst: false })

      if (mealsError) {
        console.error('fetchNutritionWeeks supabase error (meals):', mealsError)
      } else {
        mealsData = meals || []
      }
    }

    // Fetch all meal foods for these meals
    const mealIds = mealsData.map(meal => meal.id)
    const mealFoods = mealIds.length > 0 ? await fetchDayMealFoods(mealIds) : []
    
    // Group meal foods by meal_id
    const foodsByMealId = new Map<string, DayMealFood[]>()
    mealFoods.forEach(food => {
      const mealId = food.meal_id
      if (!foodsByMealId.has(mealId)) {
        foodsByMealId.set(mealId, [])
      }
      foodsByMealId.get(mealId)!.push(food)
    })

    // Group meals by nutrition_day (uuid string)
    const mealsByDayId = new Map<string, DayMeal[]>()
    mealsData.forEach(meal => {
      const dayId = String(meal.nutrition_day) // Ensure it's a string
      if (!mealsByDayId.has(dayId)) {
        mealsByDayId.set(dayId, [])
      }
      mealsByDayId.get(dayId)!.push({
        id: meal.id,
        name: meal.name,
        meal_template_id: meal.meal_template_id,
        nutrition_day: meal.nutrition_day,
        meal_time: meal.meal_time,
        meal_number: meal.meal_number,
        created_at: meal.created_at,
        updated_at: meal.updated_at,
        foods: foodsByMealId.get(meal.id) || [],
      })
    })

    // Group days by nutrition_week_id
    const daysByWeekId = new Map<number, NutritionDay[]>()
    if (daysData) {
      daysData.forEach(day => {
        const weekId = day.nutrition_week_id
        const dayId = String(day.id) // Convert to string for UUID
        if (!daysByWeekId.has(weekId)) {
          daysByWeekId.set(weekId, [])
        }
        daysByWeekId.get(weekId)!.push({
          id: dayId,
          nutrition_week_id: day.nutrition_week_id,
          day_of_week: day['day of week'] || day.day_of_week, // Handle both possible column names
          created_at: day.created_at,
          updated_at: day.updated_at,
          meals: mealsByDayId.get(dayId) || [],
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
