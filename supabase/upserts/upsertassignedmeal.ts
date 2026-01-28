import { supabase } from '@/supabase/supabaseClient'
import { AssignedMeal, AssignedMealStatus } from '@/supabase/fetches/fetchassignedmeals'

export type AssignedMealInput = {
  id?: string // uuid
  person_id: string // uuid, references people.id
  meal_id: string // uuid, references day_meals.id
  assigned_date: string // date
  status?: AssignedMealStatus // defaults to 'pending'
}

export async function upsertAssignedMeal(assignedMeal: AssignedMealInput): Promise<AssignedMeal | null> {
  try {
    const mealData = {
      person_id: assignedMeal.person_id,
      meal_id: assignedMeal.meal_id,
      assigned_date: assignedMeal.assigned_date,
      status: assignedMeal.status || 'pending',
      updated_at: new Date().toISOString(),
    }

    if (assignedMeal.id) {
      // Update existing assigned meal
      const { data, error } = await supabase
        .from('meals_occurances')
        .update(mealData)
        .eq('id', assignedMeal.id)
        .select()
        .single()

      if (error) throw error
      return data as AssignedMeal
    } else {
      // Insert new assigned meal
      const { data, error } = await supabase
        .from('meals_occurances')
        .insert([mealData])
        .select()
        .single()

      if (error) throw error
      return data as AssignedMeal
    }
  } catch (err) {
    console.error('Error upserting assigned meal:', err)
    return null
  }
}

export async function deleteAssignedMeal(assignedMealId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('meals_occurances')
      .delete()
      .eq('id', assignedMealId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting assigned meal:', err)
    return false
  }
}

