'use client'

import React, { useState, useMemo } from 'react'
import { NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type LocalNutritionEntry = {
  entry_date: string
  calories: number | null
  protein_grams: number | null
  carbs_grams: number | null
  fats_grams: number | null
}

type EditNutritionProps = {
  clientId: string
  initialEntries: NutritionEntry[]
  onSave: (entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>
  onCancel: () => void
}

export default function EditNutrition({
  clientId,
  initialEntries,
  onSave,
  onCancel,
}: EditNutritionProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isSaving, setIsSaving] = useState(false)

  // Create a map of entries by date for quick lookup - use state to trigger re-renders
  const [entriesMap, setEntriesMap] = useState<Map<string, LocalNutritionEntry>>(() => {
    const map = new Map<string, LocalNutritionEntry>()
    initialEntries.forEach(e => {
      map.set(e.entry_date, {
        entry_date: e.entry_date,
        calories: e.calories,
        protein_grams: e.protein_grams,
        carbs_grams: e.carbs_grams,
        fats_grams: e.fats_grams,
      })
    })
    return map
  })

  // Generate all days in the current month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [currentMonth])

  // Get entry for a specific date, or create empty one
  const getEntryForDate = (date: Date): LocalNutritionEntry => {
    const dateStr = date.toISOString().split('T')[0]
    return entriesMap.get(dateStr) || {
      entry_date: dateStr,
      calories: null,
      protein_grams: null,
      carbs_grams: null,
      fats_grams: null,
    }
  }

  // Update entry for a specific date
  const updateEntryForDate = (date: Date, field: keyof LocalNutritionEntry, value: any) => {
    const dateStr = date.toISOString().split('T')[0]
    setEntriesMap(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(dateStr)
      
      if (existing) {
        newMap.set(dateStr, { ...existing, [field]: value })
      } else {
        newMap.set(dateStr, {
          entry_date: dateStr,
          calories: null,
          protein_grams: null,
          carbs_grams: null,
          fats_grams: null,
          [field]: value,
        })
      }
      
      return newMap
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Get all entries from the map (including entries from other months that weren't modified)
      const allEntries = Array.from(entriesMap.values())
        .filter(e => {
          // Only include entries that have at least one macro value filled
          return e.calories !== null || e.protein_grams !== null || e.carbs_grams !== null || e.fats_grams !== null
        })
        .map(e => ({
          client_id: clientId,
          entry_date: e.entry_date,
          calories: e.calories,
          protein_grams: e.protein_grams,
          carbs_grams: e.carbs_grams,
          fats_grams: e.fats_grams,
        }))

      await onSave(allEntries)
    } catch (err) {
      console.error('Failed to save nutrition entries:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 bg-card border border-border rounded-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
            {monthName}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            className="cursor-pointer bg-muted text-foreground border-border hover:bg-muted/80 hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-foreground font-semibold">Date</th>
              <th className="text-left p-2 text-foreground font-semibold">Calories</th>
              <th className="text-left p-2 text-foreground font-semibold">Protein (g)</th>
              <th className="text-left p-2 text-foreground font-semibold">Carbs (g)</th>
              <th className="text-left p-2 text-foreground font-semibold">Fat (g)</th>
            </tr>
          </thead>
          <tbody>
            {daysInMonth.map((date) => {
              const entry = getEntryForDate(date)
              const dateStr = date.toISOString().split('T')[0]
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              
              return (
                <tr
                  key={dateStr}
                  className={`border-b border-border hover:bg-muted ${isToday ? 'bg-background' : ''}`}
                >
                  <td className="p-2 text-muted-foreground">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={entry.calories ?? ''}
                      onChange={(e) =>
                        updateEntryForDate(
                          date,
                          'calories',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="—"
                      className="bg-input text-foreground border-border placeholder-muted-foreground w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={entry.protein_grams ?? ''}
                      onChange={(e) =>
                        updateEntryForDate(
                          date,
                          'protein_grams',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="—"
                      className="bg-input text-foreground border-border placeholder-muted-foreground w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={entry.carbs_grams ?? ''}
                      onChange={(e) =>
                        updateEntryForDate(
                          date,
                          'carbs_grams',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="—"
                      className="bg-input text-foreground border-border placeholder-muted-foreground w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={entry.fats_grams ?? ''}
                      onChange={(e) =>
                        updateEntryForDate(
                          date,
                          'fats_grams',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="—"
                      className="bg-input text-foreground border-border placeholder-muted-foreground w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

