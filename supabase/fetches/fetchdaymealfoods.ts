import { supabase } from '@/supabase/supabaseClient'

export type DayMealFood = {
  id: string // uuid
  meal_id: string // uuid, references day_meals.id
  food_id: number | null // int4, references foods.id
  food_name: string | null
  amount: number | null
  unit: string | null // text, references food_units.id
  created_at: string
  updated_at: string
}

export async function fetchDayMealFoods(mealIds: string[]): Promise<DayMealFood[]> {
  try {
    if (mealIds.length === 0) return []

    const { data, error } = await supabase
      .from('meals_foods_programmed')
      .select('*')
      .in('meal_id', mealIds)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching meal foods:', error)
      return []
    }

    return (data || []) as DayMealFood[]
  } catch (err) {
    console.error('Error fetching meal foods:', err)
    return []
  }
}

