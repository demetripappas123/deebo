'use client'

import { supabase } from '@/supabase/supabaseClient'
import { fetchDayMealFoods, DayMealFood } from './fetchdaymealfoods'

export type MealTemplate = {
  id: string // uuid
  name: string | null
  trainer_id: string | null
  created_at: string
  updated_at: string
  foods: DayMealFood[] // Foods from meals_foods_programmed
}

/**
 * Fetch meal templates for the current trainer
 * Meal templates are day_meals where nutrition_day is null and meal_template_id is null
 * (or they could be in a separate meal_templates table - adjust as needed)
 */
export async function fetchMealTemplates(trainerId: string | null): Promise<MealTemplate[]> {
  try {
    if (!trainerId) return []

    // Fetch meals that are templates (nutrition_day is null, indicating they're templates)
    // Or if there's a separate meal_templates table, query that instead
    const { data, error } = await supabase
      .from('day_meals')
      .select('*')
      .is('nutrition_day', null) // Templates don't belong to a specific day
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching meal templates:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Fetch foods for all templates
    const mealIds = data.map(meal => meal.id)
    const mealFoods = await fetchDayMealFoods(mealIds)
    const foodsByMealId = new Map<string, DayMealFood[]>()
    mealFoods.forEach(food => {
      if (!foodsByMealId.has(food.meal_id)) {
        foodsByMealId.set(food.meal_id, [])
      }
      foodsByMealId.get(food.meal_id)!.push(food)
    })

    // Map to MealTemplate format
    return data.map(meal => ({
      id: meal.id,
      name: meal.name,
      trainer_id: trainerId,
      created_at: meal.created_at,
      updated_at: meal.updated_at,
      foods: foodsByMealId.get(meal.id) || [],
    })) as MealTemplate[]
  } catch (err) {
    console.error('Error fetching meal templates:', err)
    return []
  }
}

