import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash } from "lucide-react"
import { Food } from "@/supabase/fetches/fetchfoods"
import { NutritionDay } from "@/supabase/fetches/fetchnutritionweeks"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

type LocalMeal = {
  meal_time: string | null
  food_id: number | null
  portion_size: number | null
  portion_unit: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
}

type AddNutritionDayDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: {
    dayTitle: string
    dayOfWeek: string
    date: string | null
    meals: LocalMeal[]
    dayId?: number
  }) => void
  weekId: number
  foodLibrary: Food[]
  dayId?: number // If provided, dialog is in edit mode
  initialDayData?: NutritionDay // Day data for edit mode
}

export default function AddNutritionDayDialog({
  open,
  onOpenChange,
  onSubmit,
  weekId,
  foodLibrary,
  dayId,
  initialDayData,
}: AddNutritionDayDialogProps) {
  const [dayOfWeek, setDayOfWeek] = useState<string>("Monday")
  const [meals, setMeals] = useState<LocalMeal[]>([])
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({})
  const [searchValue, setSearchValue] = useState<{ [key: number]: string }>({})

  // Reset form state when dialog opens, or load existing data if editing
  useEffect(() => {
    if (open) {
      if (dayId && initialDayData) {
        // Edit mode: load existing data
        setDayOfWeek(initialDayData.day_of_week)
        const mappedMeals: LocalMeal[] = initialDayData.meals.map(meal => ({
          meal_time: meal.meal_time,
          food_id: meal.food_id,
          portion_size: meal.portion_size,
          portion_unit: meal.portion_unit,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          notes: meal.notes,
        }))
        setMeals(mappedMeals)
      } else {
        // Add mode: reset all form state
        setDayOfWeek("Monday")
        setMeals([])
      }
      setOpenCombobox({})
      setSearchValue({})
    }
  }, [open, dayId, initialDayData])

  const addMeal = () => {
    setMeals(prev => [
      ...prev,
      {
        meal_time: null,
        food_id: null,
        portion_size: null,
        portion_unit: null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        notes: null,
      },
    ])
  }

  const removeMeal = (index: number) => {
    setMeals(prev => prev.filter((_, i) => i !== index))
  }

  const updateMeal = <K extends keyof LocalMeal>(
    index: number,
    key: K,
    value: LocalMeal[K]
  ) => {
    setMeals(prev => prev.map((meal, i) => (i === index ? { ...meal, [key]: value } : meal)))
  }

  const handleSubmit = () => {
    onSubmit({
      dayTitle: "", // Not used anymore, kept for compatibility
      dayOfWeek,
      date: null, // Not used anymore, kept for compatibility
      meals,
      dayId: dayId,
    })
    onOpenChange(false)
  }

  const getFoodName = (foodId: number | null): string => {
    if (!foodId) return ""
    const food = foodLibrary.find(f => f.id === foodId)
    return food?.description || ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {dayId ? "Edit Nutrition Day" : "Add Nutrition Day"}
          </DialogTitle>
        </DialogHeader>

        {/* Day info */}
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Day of Week</label>
              <Input
                type="number"
                min="0"
                max="6"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value) || 0)}
                placeholder="0-6"
                className="bg-input text-foreground border-border placeholder-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Date (Optional)</label>
              <Input
                type="date"
                value={date || ""}
                onChange={(e) => setDate(e.target.value || null)}
                className="bg-input text-foreground border-border placeholder-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Meals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Meals</label>
            <Button
              type="button"
              onClick={addMeal}
              variant="outline"
              size="sm"
              className="bg-muted text-foreground border-border hover:bg-muted/80"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Meal
            </Button>
          </div>

          {meals.map((meal, index) => (
            <div key={index} className="border border-border p-4 rounded-lg relative bg-background">
              {meals.length > 0 && (
                <button
                  onClick={() => removeMeal(index)}
                  className="absolute right-2 top-2 text-destructive hover:text-destructive/80 cursor-pointer"
                >
                  <Trash size={16} />
                </button>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-foreground">Meal Time</label>
                    <Input
                      value={meal.meal_time || ""}
                      onChange={(e) => updateMeal(index, "meal_time", e.target.value || null)}
                      placeholder="e.g. Breakfast, Lunch, Dinner"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-sm text-foreground">Food</label>
                    <Input
                      value={getFoodName(meal.food_id)}
                      onChange={(e) => {
                        const value = e.target.value
                        setSearchValue(prev => ({ ...prev, [index]: value }))
                        setOpenCombobox(prev => ({ ...prev, [index]: value.length > 0 }))
                      }}
                      onFocus={() => {
                        setOpenCombobox(prev => ({ ...prev, [index]: true }))
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setOpenCombobox(prev => ({ ...prev, [index]: false }))
                        }, 200)
                      }}
                      placeholder="Search foods..."
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                    {openCombobox[index] && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search foods..."
                            value={searchValue[index] || ""}
                            onValueChange={(value) => {
                              setSearchValue(prev => ({ ...prev, [index]: value }))
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>No foods found.</CommandEmpty>
                            <CommandGroup>
                              {foodLibrary
                                .filter(food =>
                                  food.description.toLowerCase().includes((searchValue[index] || "").toLowerCase())
                                )
                                .slice(0, 50)
                                .map((food) => (
                                  <CommandItem
                                    key={food.id}
                                    value={food.description}
                                    onSelect={() => {
                                      updateMeal(index, "food_id", food.id)
                                      setOpenCombobox(prev => ({ ...prev, [index]: false }))
                                      setSearchValue(prev => ({ ...prev, [index]: food.description }))
                                    }}
                                  >
                                    {food.description}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-foreground">Portion Size</label>
                    <Input
                      type="number"
                      value={meal.portion_size || ""}
                      onChange={(e) => updateMeal(index, "portion_size", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 100"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground">Unit</label>
                    <Input
                      value={meal.portion_unit || ""}
                      onChange={(e) => updateMeal(index, "portion_unit", e.target.value || null)}
                      placeholder="e.g. g, oz, serving"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm text-foreground">Calories</label>
                    <Input
                      type="number"
                      value={meal.calories || ""}
                      onChange={(e) => updateMeal(index, "calories", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="cal"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground">Protein (g)</label>
                    <Input
                      type="number"
                      value={meal.protein_g || ""}
                      onChange={(e) => updateMeal(index, "protein_g", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="g"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground">Carbs (g)</label>
                    <Input
                      type="number"
                      value={meal.carbs_g || ""}
                      onChange={(e) => updateMeal(index, "carbs_g", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="g"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground">Fat (g)</label>
                    <Input
                      type="number"
                      value={meal.fat_g || ""}
                      onChange={(e) => updateMeal(index, "fat_g", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="g"
                      className="bg-input text-foreground border-border placeholder-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-foreground">Notes</label>
                  <Textarea
                    value={meal.notes || ""}
                    onChange={(e) => updateMeal(index, "notes", e.target.value || null)}
                    placeholder="Optional notes..."
                    className="bg-input text-foreground border-border placeholder-muted-foreground"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {dayId ? "Update Day" : "Add Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

