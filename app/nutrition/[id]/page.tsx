'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { fetchNutritionWeeks, NutritionWeek } from '@/supabase/fetches/fetchnutritionweeks'
import { upsertNutritionWeek } from '@/supabase/upserts/upsertnutritionweek'
import { upsertNutritionDay, deleteNutritionDay } from '@/supabase/upserts/upsertnutritionday'
import { upsertDayMeal, deleteDayMeal, getNextMealSequence } from '@/supabase/upserts/upsertdaymeal'
import { fetchNutritionPrograms, NutritionProgram } from '@/supabase/fetches/fetchnutritionprograms'
import { fetchFoods, Food } from '@/supabase/fetches/fetchfoods'
import { fetchUserFoods } from '@/supabase/fetches/fetchuserfoods'
import { fetchCommunityFoods } from '@/supabase/fetches/fetchcommunityfoods'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useAuth } from '@/context/authcontext'
import AddNutritionDayDialog from '@/modules/nutrition/addnutritiondaydialog'
import DeleteNutritionWeekDialog from '@/modules/nutrition/deletenutritionweek'
import DeleteNutritionDayDialog from '@/modules/nutrition/deletenutritionday'

export default function NutritionProgramPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const [program, setProgram] = useState<NutritionProgram | null>(null)
  const [weeks, setWeeks] = useState<NutritionWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [foodLibrary, setFoodLibrary] = useState<Food[]>([])

  // For controlling the AddDayDialog per week
  const [activeWeekId, setActiveWeekId] = useState<number | null>(null)
  // For controlling edit mode - stores the day being edited
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  // For editing meals
  const [editingMealId, setEditingMealId] = useState<number | null>(null)

  const refreshWeeks = async () => {
    const programId = params.id
    if (!programId || typeof programId !== 'string') return

    try {
      const weeksData = await fetchNutritionWeeks(programId)
      setWeeks(weeksData)
    } catch (err) {
      console.error('Failed to fetch weeks:', err)
    }
  }

  useEffect(() => {
    const loadProgram = async () => {
      const programId = params.id
      if (!programId || typeof programId !== 'string') return setLoading(false)

      setLoading(true)
      try {
        // Fetch program
        const programs = await fetchNutritionPrograms(user?.id)
        const programData = programs.find(p => p.id === programId)

        if (!programData) {
          setProgram(null)
        } else {
          setProgram(programData)
        }

        // Load food library
        const [baseFoods, userFoods, communityFoods] = await Promise.all([
          fetchFoods(),
          fetchUserFoods(user?.id),
          fetchCommunityFoods()
        ])
        const allFoods = [...baseFoods, ...userFoods, ...communityFoods]
        setFoodLibrary(allFoods)

        await refreshWeeks()
      } catch (err) {
        console.error('Unexpected error loading program:', err)
        setProgram(null)
        setWeeks([])
      } finally {
        setLoading(false)
      }
    }

    loadProgram()
  }, [params.id, user])

  const handleAddWeek = async () => {
    if (!program) return

    try {
      const nextWeekNumber = weeks.length > 0 
        ? Math.max(...weeks.map(w => w.week_number)) + 1 
        : 1

      const savedWeek = await upsertNutritionWeek({
        program_id: program.id,
        week_number: nextWeekNumber,
      })
      
      if (savedWeek) {
        await refreshWeeks()
      }
    } catch (err) {
      console.error('Failed to add week:', err)
    }
  }

  const handleAddDaySubmit = async (payload: { 
    dayTitle: string
    dayOfWeek: number
    date: string | null
    meals: Array<{
      meal_time: string | null
      food_id: number | null
      portion_size: number | null
      portion_unit: string | null
      calories: number | null
      protein_g: number | null
      carbs_g: number | null
      fat_g: number | null
      notes: string | null
    }>
    dayId?: number
  }) => {
    const isEditMode = !!payload.dayId

    try {
      let dayId: number

      if (isEditMode) {
        // EDIT MODE: Update existing day
        if (!payload.dayId) return

        const week = weeks.find(w => w.days.some(d => d.id === payload.dayId))
        if (!week) return

        const updatedDay = await upsertNutritionDay({
          id: payload.dayId,
          nutrition_week_id: week.id,
          day_of_week: payload.dayOfWeek,
        })
        
        if (!updatedDay) {
          throw new Error('Failed to update day')
        }
        dayId = updatedDay.id

        // Delete existing meals and recreate
        const day = week.days.find(d => d.id === dayId)
        if (day) {
          for (const meal of day.meals) {
            await deleteDayMeal(meal.id)
          }
        }
      } else {
        // ADD MODE: Create new day
        if (!activeWeekId) return

        const newDay = await upsertNutritionDay({
          nutrition_week_id: activeWeekId,
          day_of_week: payload.dayOfWeek,
        })
        
        if (!newDay) {
          throw new Error('Failed to create day')
        }
        dayId = newDay.id
      }

      // Add meals
      for (let i = 0; i < payload.meals.length; i++) {
        const meal = payload.meals[i]
        await upsertDayMeal({
          day_id: dayId,
          meal_time: meal.meal_time,
          sequence: i + 1,
          food_id: meal.food_id,
          portion_size: meal.portion_size,
          portion_unit: meal.portion_unit,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          notes: meal.notes,
        })
      }

      // Refresh weeks to show the updated/new day
      await refreshWeeks()
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'add'} day:`, err)
    } finally {
      setActiveWeekId(null)
      setEditingDayId(null)
    }
  }

  const handleDeleteWeek = async (weekId: number) => {
    try {
      await refreshWeeks()
    } catch (err) {
      console.error('Failed to refresh after delete:', err)
    }
  }

  const handleDeleteDay = async (dayId: number) => {
    try {
      await refreshWeeks()
    } catch (err) {
      console.error('Failed to refresh after delete:', err)
    }
  }

  if (loading) return <p className="text-muted-foreground p-6">Loading nutrition program...</p>
  if (!program) return <p className="text-muted-foreground p-6">Nutrition program not found.</p>

  return (
    <div className="p-6 bg-background min-h-screen text-foreground">
      {/* Header Section */}
      <div className="space-y-4 mb-6">
        <button
          onClick={() => router.back()}
          className="px-3 py-1 bg-muted rounded-md hover:bg-muted/80 text-foreground"
        >
          ← Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{program.name}</h1>
            {program.description && (
              <p className="text-muted-foreground">{program.description}</p>
            )}
          </div>
          
          <div className="flex justify-start">
            <button
              onClick={handleAddWeek}
              className="flex items-center gap-2 px-4 py-2 bg-primary rounded-md hover:bg-primary/90 cursor-pointer text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {weeks.length === 0 && (
          <p className="text-muted-foreground">No weeks yet. Add one!</p>
        )}

        {weeks.map(week => (
          <div
            key={week.id}
            className="flex items-start justify-between p-4 bg-card border border-border rounded-md"
          >
            <div className="flex-1">
              <p className="text-foreground font-semibold mb-2">
                Week {week.week_number}
              </p>

              <div className="flex gap-2 flex-wrap items-start justify-between">
                <div className="flex gap-2 flex-wrap items-start">
                  {week.days.map(day => (
                    <div
                      key={day.id}
                      className="p-3 border border-border rounded-md bg-background min-w-[250px] relative"
                    >
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => setEditingDayId(day.id)}
                          className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Edit day"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <DeleteNutritionDayDialog
                          dayId={day.id}
                          dayTitle={day.day_of_week}
                          onDeleted={handleDeleteDay}
                        />
                      </div>

                      <h3 className="text-foreground font-medium mb-2">
                        {day.day_of_week}
                      </h3>

                      {/* Meals */}
                      <div className="space-y-2">
                        {day.meals.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No meals</p>
                        ) : (
                          day.meals.map(meal => {
                            const food = foodLibrary.find(f => f.id === meal.food_id)
                            return (
                              <div key={meal.id} className="text-xs border-l-2 pl-2 border-border">
                                <div className="font-medium text-foreground">
                                  {meal.meal_time || `Meal ${meal.sequence}`}
                                </div>
                                {food && (
                                  <div className="text-muted-foreground">
                                    {food.description}
                                    {meal.portion_size && (
                                      <span> - {meal.portion_size} {meal.portion_unit || 'g'}</span>
                                    )}
                                  </div>
                                )}
                                {(meal.calories || meal.protein_g || meal.carbs_g || meal.fat_g) && (
                                  <div className="text-muted-foreground mt-1">
                                    {meal.calories && `${meal.calories} cal`}
                                    {meal.protein_g && ` • ${meal.protein_g}g P`}
                                    {meal.carbs_g && ` • ${meal.carbs_g}g C`}
                                    {meal.fat_g && ` • ${meal.fat_g}g F`}
                                  </div>
                                )}
                                {meal.notes && (
                                  <div className="text-muted-foreground italic">{meal.notes}</div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveWeekId(week.id)}
                  className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md text-foreground cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Day
                </button>
              </div>
            </div>

            <div className="ml-4">
              <DeleteNutritionWeekDialog
                weekId={week.id}
                weekNumber={week.week_number}
                onDeleted={handleDeleteWeek}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Day Dialog */}
      {activeWeekId && (
        <AddNutritionDayDialog
          open={!!activeWeekId}
          onOpenChange={(open) => !open && setActiveWeekId(null)}
          weekId={activeWeekId}
          foodLibrary={foodLibrary}
          onSubmit={handleAddDaySubmit}
        />
      )}

      {editingDayId && (() => {
        const day = weeks.flatMap(w => w.days).find(d => d.id === editingDayId)
        const week = weeks.find(w => w.days.some(d => d.id === editingDayId))
        if (!day || !week) return null
        
        return (
          <AddNutritionDayDialog
            open={!!editingDayId}
            onOpenChange={(open) => !open && setEditingDayId(null)}
            weekId={week.id}
            dayId={editingDayId}
            foodLibrary={foodLibrary}
            onSubmit={handleAddDaySubmit}
            initialDayData={day}
          />
        )
      })()}
    </div>
  )
}

