import { supabase } from '@/supabase/supabaseClient'
import { DayMeal } from '@/supabase/fetches/fetchnutritionweeks'

export type DayMealInput = {
  id?: string // uuid
  name?: string | null
  meal_template_id?: string | null
  nutrition_day: string // uuid, references nutrition_days.id
  meal_time?: string | null // timestamp
  meal_number?: number | null
}

export async function upsertDayMeal(meal: DayMealInput): Promise<DayMeal | null> {
  try {
    const mealData = {
      name: meal.name?.trim() || null,
      meal_template_id: meal.meal_template_id || null,
      nutrition_day: meal.nutrition_day,
      meal_time: meal.meal_time || null, // timestamp - pass as-is
      meal_number: meal.meal_number || null,
      updated_at: new Date().toISOString(),
    }

    if (meal.id) {
      // Update existing meal
      const { data, error } = await supabase
        .from('day_meals')
        .update(mealData)
        .eq('id', meal.id)
        .select()
        .single()

      if (error) throw error
      return {
        ...data,
        foods: [], // Foods will be fetched separately
      } as DayMeal
    } else {
      // Insert new meal
      const { data, error } = await supabase
        .from('day_meals')
        .insert([mealData])
        .select()
        .single()

      if (error) throw error
      return {
        ...data,
        foods: [], // Foods will be fetched separately
      } as DayMeal
    }
  } catch (err) {
    console.error('Error upserting day meal:', err)
    return null
  }
}

export async function deleteDayMeal(mealId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('day_meals')
      .delete()
      .eq('id', mealId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting day meal:', err)
    return false
  }
}

// Helper function to get next meal_number for a day
export async function getNextMealNumber(nutritionDayId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('day_meals')
      .select('meal_number')
      .eq('nutrition_day', nutritionDayId)
      .order('meal_number', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data?.meal_number ?? 0) + 1
  } catch (err) {
    console.error('Error getting next meal number:', err)
    return 1
  }
}

