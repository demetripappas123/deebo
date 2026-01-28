import { supabase } from '@/supabase/supabaseClient'
import { NutritionDay } from '@/supabase/fetches/fetchnutritionweeks'

export type NutritionDayInput = {
  id?: number
  nutrition_week_id: number
  day_of_week: string
}

export async function upsertNutritionDay(day: NutritionDayInput): Promise<NutritionDay | null> {
  try {
    // Build object with column name that has a space
    // Using Object.assign to ensure proper serialization
    const dayData: Record<string, any> = {
      nutrition_week_id: day.nutrition_week_id,
      updated_at: new Date().toISOString(),
    }
    // Use bracket notation for column name with space
    dayData['day of week'] = day.day_of_week

    if (day.id) {
      // Update existing day
      const { data, error } = await supabase
        .from('nutrition_days')
        .update(dayData)
        .eq('id', day.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating nutrition day:', error)
        console.error('Day data:', dayData)
        throw error
      }
      return {
        id: data.id,
        nutrition_week_id: data.nutrition_week_id,
        day_of_week: data['day of week'] || data.day_of_week, // Handle both possible column names
        created_at: data.created_at,
        updated_at: data.updated_at,
        meals: [],
      }
    } else {
      // Insert new day
      // Try insert without select first, then fetch separately if needed
      const { data: insertData, error: insertError } = await supabase
        .from('nutrition_days')
        .insert([dayData])
        .select('id, nutrition_week_id, "day of week", created_at, updated_at')
        .single()

      if (insertError) {
        // If select with quoted column fails, try without select and fetch separately
        const { data: insertOnlyData, error: insertOnlyError } = await supabase
          .from('nutrition_days')
          .insert([dayData])
          .select('id')
          .single()

        if (insertOnlyError) {
          console.error('Error inserting nutrition day:', insertOnlyError)
          console.error('Error details:', {
            message: insertOnlyError.message,
            details: insertOnlyError.details,
            hint: insertOnlyError.hint,
            code: insertOnlyError.code
          })
          console.error('Day data:', JSON.stringify(dayData, null, 2))
          console.error('Day data keys:', Object.keys(dayData))
          throw insertOnlyError
        }

        // Fetch the inserted row separately
        const { data: fetchedData, error: fetchError } = await supabase
          .from('nutrition_days')
          .select('*')
          .eq('id', insertOnlyData.id)
          .single()

        if (fetchError) {
          console.error('Error fetching inserted nutrition day:', fetchError)
          throw fetchError
        }

        return {
          id: fetchedData.id,
          nutrition_week_id: fetchedData.nutrition_week_id,
          day_of_week: fetchedData['day of week'] || fetchedData.day_of_week,
          created_at: fetchedData.created_at,
          updated_at: fetchedData.updated_at,
          meals: [],
        }
      }

      return {
        id: insertData.id,
        nutrition_week_id: insertData.nutrition_week_id,
        day_of_week: insertData['day of week'] || insertData.day_of_week,
        created_at: insertData.created_at,
        updated_at: insertData.updated_at,
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
