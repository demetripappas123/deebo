import { supabase } from '@/supabase/supabaseClient'
import { DayMeal } from '@/supabase/fetches/fetchnutritionweeks'

export type DayMealInput = {
  id?: number
  day_id: number
  meal_time?: string | null
  sequence: number
  food_id?: number | null
  portion_size?: number | null
  portion_unit?: string | null
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  notes?: string | null
  metadata?: object | null
}

export async function upsertDayMeal(meal: DayMealInput): Promise<DayMeal | null> {
  try {
    const mealData = {
      day_id: meal.day_id,
      meal_time: meal.meal_time?.trim() || null,
      sequence: meal.sequence,
      food_id: meal.food_id || null,
      portion_size: meal.portion_size || null,
      portion_unit: meal.portion_unit?.trim() || null,
      calories: meal.calories || null,
      protein_g: meal.protein_g || null,
      carbs_g: meal.carbs_g || null,
      fat_g: meal.fat_g || null,
      notes: meal.notes?.trim() || null,
      metadata: meal.metadata || null,
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
      return data as DayMeal
    } else {
      // Insert new meal
      const { data, error } = await supabase
        .from('day_meals')
        .insert([mealData])
        .select()
        .single()

      if (error) throw error
      return data as DayMeal
    }
  } catch (err) {
    console.error('Error upserting day meal:', err)
    return null
  }
}

export async function deleteDayMeal(mealId: number): Promise<boolean> {
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

// Helper function to get next sequence number for a day
export async function getNextMealSequence(dayId: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('day_meals')
      .select('sequence')
      .eq('day_id', dayId)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data?.sequence ?? 0) + 1
  } catch (err) {
    console.error('Error getting next meal sequence:', err)
    return 1
  }
}

