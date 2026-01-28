import { supabase } from '@/supabase/supabaseClient'
import { DayMealFood } from '@/supabase/fetches/fetchdaymealfoods'

export type DayMealFoodInput = {
  id?: string // uuid
  meal_id: string // uuid, references day_meals.id
  food_id: number | null // int4, references foods.id
  food_name: string | null
  amount: number | null
  unit: string | null // text, references food_units.id
}

export async function upsertDayMealFood(food: DayMealFoodInput): Promise<DayMealFood | null> {
  try {
    const foodData = {
      meal_id: food.meal_id,
      food_id: food.food_id || null,
      food_name: food.food_name?.trim() || null,
      amount: food.amount || null,
      unit: food.unit || null, // text field
      updated_at: new Date().toISOString(),
    }

    if (food.id) {
      // Update existing food
      const { data, error } = await supabase
        .from('meals_foods_programmed')
        .update(foodData)
        .eq('id', food.id)
        .select()
        .single()

      if (error) throw error
      return data as DayMealFood
    } else {
      // Insert new food
      const { data, error } = await supabase
        .from('meals_foods_programmed')
        .insert([foodData])
        .select()
        .single()

      if (error) throw error
      return data as DayMealFood
    }
  } catch (err) {
    console.error('Error upserting meal food:', err)
    return null
  }
}

export async function deleteDayMealFood(foodId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('meals_foods_programmed')
      .delete()
      .eq('id', foodId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting meal food:', err)
    return false
  }
}

