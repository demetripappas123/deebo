'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchNutritionPrograms, NutritionProgram } from '@/supabase/fetches/fetchnutritionprograms'
import { fetchFoods, Food } from '@/supabase/fetches/fetchfoods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, UtensilsCrossed, Filter } from 'lucide-react'
import { supabase } from '@/supabase/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/context/authcontext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function NutritionLibraryPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<NutritionProgram[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [programSearchQuery, setProgramSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [foodFilter, setFoodFilter] = useState<'all' | 'your' | 'base'>('all')
  const [addProgramDialogOpen, setAddProgramDialogOpen] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [addingProgram, setAddingProgram] = useState(false)
  const [addFoodDialogOpen, setAddFoodDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [programsData, foodsData] = await Promise.all([
        fetchNutritionPrograms(user?.id),
        fetchFoods()
      ])
      setPrograms(programsData)
      setFoods(foodsData)
    } catch (error) {
      console.error('Error loading nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProgram = async () => {
    if (!newProgramName.trim()) {
      alert('Please enter a program name')
      return
    }

    if (!user?.id) {
      alert('You must be logged in to create a program')
      return
    }

    setAddingProgram(true)
    try {
      const { data, error } = await supabase
        .from('nutrition_programs')
        .insert([{ 
          name: newProgramName.trim(),
          user_id: user.id
        }])
        .select()
        .single()

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
          alert('The nutrition_programs table does not exist yet. Please create it in your Supabase database.')
          return
        }
        throw error
      }

      setPrograms([data, ...programs])
      setNewProgramName('')
      setAddProgramDialogOpen(false)
    } catch (error) {
      console.error('Error adding nutrition program:', error)
      alert('Error adding nutrition program. Please try again.')
    } finally {
      setAddingProgram(false)
    }
  }

  // Filter programs based on search
  const filteredPrograms = useMemo(() => {
    if (!programSearchQuery.trim()) {
      return programs
    }
    const query = programSearchQuery.toLowerCase().trim()
    return programs.filter(program =>
      program.name.toLowerCase().includes(query)
    )
  }, [programs, programSearchQuery])

  // Filter foods based on search and filter type
  const filteredFoods = useMemo(() => {
    let filtered = foods

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(food =>
        food.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply type filter (for now, all foods go to "Food Base" since we don't have user foods yet)
    // TODO: Add user_id field to foods table when backend is ready
    switch (foodFilter) {
      case 'your':
        // Empty for now - will be populated when backend is ready
        return []
      case 'base':
        return filtered
      case 'all':
      default:
        return filtered
    }
  }, [foods, searchQuery, foodFilter])

  if (loading) {
    return (
      <div className="p-8 bg-background text-foreground min-h-screen">
        <p className="text-muted-foreground">Loading nutrition library...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Nutrition Library</h1>
      </div>

      {/* Nutrition Programs Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Nutrition Programs</h2>
        </div>

        {/* Program Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search programs..."
              value={programSearchQuery}
              onChange={(e) => setProgramSearchQuery(e.target.value)}
              className="pl-10 bg-input text-foreground border-border placeholder-muted-foreground h-9"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Blank card to create new program */}
          <button
            onClick={() => setAddProgramDialogOpen(true)}
            className="aspect-video bg-card border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-muted transition-colors cursor-pointer group"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground">Create Program</span>
            </div>
          </button>

          {/* Existing programs */}
          {filteredPrograms.map((program) => (
            <div
              key={program.id}
              className="aspect-video bg-card border border-border rounded-lg p-4 flex flex-col justify-between hover:bg-muted transition-colors cursor-pointer"
            >
              <h3 className="text-foreground font-medium text-sm truncate">{program.name}</h3>
              <div className="text-xs text-muted-foreground mt-2">
                {program.created_at ? new Date(program.created_at).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Foods Library Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Foods Library</h2>
        </div>

        {/* Foods Search, Filter, and Add Button */}
        <div className="mb-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input text-foreground border-border placeholder-muted-foreground h-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 px-3 bg-input border-border text-foreground hover:bg-muted cursor-pointer"
              >
                <Filter className="h-4 w-4 mr-2" />
                {foodFilter === 'all' ? 'All Foods' : foodFilter === 'your' ? 'Your Foods' : 'Food Base'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
            <DropdownMenuItem
              onClick={() => setFoodFilter('all')}
              className={`cursor-pointer ${foodFilter === 'all' ? 'bg-muted' : ''}`}
            >
              All Foods
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFoodFilter('your')}
              className={`cursor-pointer ${foodFilter === 'your' ? 'bg-muted' : ''}`}
            >
              Your Foods
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFoodFilter('base')}
              className={`cursor-pointer ${foodFilter === 'base' ? 'bg-muted' : ''}`}
            >
              Food Base
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setAddFoodDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Food
          </Button>
        </div>

        {filteredFoods.length === 0 ? (
          <div className="p-8 text-center bg-card border border-border rounded-lg">
            <p className="text-muted-foreground">
              {searchQuery ? 'No foods found matching your search.' : 'No foods in library.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))', overflow: 'hidden' }}>
            {filteredFoods.slice(0, 8).map((food) => (
              <div
                key={food.id}
                className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                {/* Food Image Placeholder */}
                <div className="mb-3 aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src="/meowl.jpg"
                    alt={food.description}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                
                {/* Food Name */}
                <h3 className="text-foreground font-medium text-sm truncate mb-1">{food.description}</h3>
                
                {/* Brand Name */}
                {food.brand_name && (
                  <p className="text-xs text-muted-foreground truncate mb-1">{food.brand_name}</p>
                )}
                
                {/* Category */}
                {food.category && (
                  <p className="text-xs text-muted-foreground">{food.category}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Food Dialog */}
      <Dialog open={addFoodDialogOpen} onOpenChange={setAddFoodDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Food</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new food to your library. This feature will be implemented soon.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setAddFoodDialogOpen(false)}
              variant="outline"
              className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Program Dialog */}
      <Dialog open={addProgramDialogOpen} onOpenChange={setAddProgramDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Nutrition Program</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a name for your new nutrition program.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Program name..."
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddProgram()
                }
              }}
              className="bg-input text-foreground border-border placeholder-muted-foreground"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setAddProgramDialogOpen(false)
                setNewProgramName('')
              }}
              variant="outline"
              className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProgram}
              disabled={addingProgram || !newProgramName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {addingProgram ? 'Creating...' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
