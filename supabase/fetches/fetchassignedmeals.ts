'use client'

import { supabase } from '@/supabase/supabaseClient'
import { DayMeal, DayMealFood } from './fetchnutritionweeks'
import { fetchDayMealFoods } from './fetchdaymealfoods'

export type AssignedMealStatus = 'pending' | 'completed' | 'skipped'

export type AssignedMeal = {
  id: string // uuid
  person_id: string // uuid, references people.id
  meal_id: string // uuid, references day_meals.id
  assigned_date: string // date
  status: AssignedMealStatus
  created_at: string
  updated_at: string
  meal?: DayMeal // Populated meal data
}

export async function fetchAssignedMeals(personId: string): Promise<AssignedMeal[]> {
  try {
    const { data, error } = await supabase
      .from('meals_occurances')
      .select('*')
      .eq('person_id', personId)
      .order('assigned_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assigned meals:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    if (!data || data.length === 0) return []

    // Fetch meal details for each assigned meal
    const mealIds = [...new Set(data.map(am => am.meal_id))]
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meals')
      .select('*')
      .in('id', mealIds)

    if (mealsError) {
      console.error('Error fetching meal details:', mealsError)
      return data.map(am => ({
        ...am,
        meal: undefined,
      })) as AssignedMeal[]
    }

    // Fetch foods for all meals
    const mealFoods = await fetchDayMealFoods(mealIds)
    const foodsByMealId = new Map<string, DayMealFood[]>()
    mealFoods.forEach(food => {
      if (!foodsByMealId.has(food.meal_id)) {
        foodsByMealId.set(food.meal_id, [])
      }
      foodsByMealId.get(food.meal_id)!.push(food)
    })

    // Map meals with foods
    const mealsMap = new Map<string, DayMeal>()
    if (mealsData) {
      mealsData.forEach(meal => {
        mealsMap.set(meal.id, {
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
    }

    // Combine assigned meals with meal data
    return data.map(am => ({
      ...am,
      meal: mealsMap.get(am.meal_id),
    })) as AssignedMeal[]
  } catch (err) {
    console.error('Error fetching assigned meals:', err)
    return []
  }
}


import { supabase } from '@/supabase/supabaseClient'
import { DayMeal, DayMealFood } from './fetchnutritionweeks'
import { fetchDayMealFoods } from './fetchdaymealfoods'

export type AssignedMealStatus = 'pending' | 'completed' | 'skipped'

export type AssignedMeal = {
  id: string // uuid
  person_id: string // uuid, references people.id
  meal_id: string // uuid, references day_meals.id
  assigned_date: string // date
  status: AssignedMealStatus
  created_at: string
  updated_at: string
  meal?: DayMeal // Populated meal data
}

export async function fetchAssignedMeals(personId: string): Promise<AssignedMeal[]> {
  try {
    const { data, error } = await supabase
      .from('meals_occurances')
      .select('*')
      .eq('person_id', personId)
      .order('assigned_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assigned meals:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    if (!data || data.length === 0) return []

    // Fetch meal details for each assigned meal
    const mealIds = [...new Set(data.map(am => am.meal_id))]
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meals')
      .select('*')
      .in('id', mealIds)

    if (mealsError) {
      console.error('Error fetching meal details:', mealsError)
      return data.map(am => ({
        ...am,
        meal: undefined,
      })) as AssignedMeal[]
    }

    // Fetch foods for all meals
    const mealFoods = await fetchDayMealFoods(mealIds)
    const foodsByMealId = new Map<string, DayMealFood[]>()
    mealFoods.forEach(food => {
      if (!foodsByMealId.has(food.meal_id)) {
        foodsByMealId.set(food.meal_id, [])
      }
      foodsByMealId.get(food.meal_id)!.push(food)
    })

    // Map meals with foods
    const mealsMap = new Map<string, DayMeal>()
    if (mealsData) {
      mealsData.forEach(meal => {
        mealsMap.set(meal.id, {
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
    }

    // Combine assigned meals with meal data
    return data.map(am => ({
      ...am,
      meal: mealsMap.get(am.meal_id),
    })) as AssignedMeal[]
  } catch (err) {
    console.error('Error fetching assigned meals:', err)
    return []
  }
}

