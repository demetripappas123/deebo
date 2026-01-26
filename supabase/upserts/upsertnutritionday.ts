import { supabase } from '@/supabase/supabaseClient'
import { NutritionDay } from '@/supabase/fetches/fetchnutritionweeks'

export type NutritionDayInput = {
  id?: number
  nutrition_week_id: number
  day_of_week: string
}

export async function upsertNutritionDay(day: NutritionDayInput): Promise<NutritionDay | null> {
  try {
    const dayData = {
      nutrition_week_id: day.nutrition_week_id,
      day_of_week: day.day_of_week,
      updated_at: new Date().toISOString(),
    }

    if (day.id) {
      // Update existing day
      const { data, error } = await supabase
        .from('nutrition_days')
        .update(dayData)
        .eq('id', day.id)
        .select()
        .single()

      if (error) throw error
      return {
        id: data.id,
        nutrition_week_id: data.nutrition_week_id,
        day_of_week: data.day_of_week,
        created_at: data.created_at,
        updated_at: data.updated_at,
        meals: [],
      }
    } else {
      // Insert new day
      const { data, error } = await supabase
        .from('nutrition_days')
        .insert([dayData])
        .select()
        .single()

      if (error) throw error
      return {
        id: data.id,
        nutrition_week_id: data.nutrition_week_id,
        day_of_week: data.day_of_week,
        created_at: data.created_at,
        updated_at: data.updated_at,
        meals: [],
      }
    }
  } catch (err) {
    console.error('Error upserting nutrition day:', err)
    return null
  }
}

export async function deleteNutritionDay(dayId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('nutrition_days')
      .delete()
      .eq('id', dayId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting nutrition day:', err)
    return false
  }
}
