'use client'

import { useEffect, useState } from 'react'
import { fetchNutritionItems, NutritionLibraryItem } from '@/supabase/fetches/fetchnutritionlib'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '@/supabase/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function NutritionLibraryPage() {
  const [items, setItems] = useState<NutritionLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<NutritionLibraryItem | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await fetchNutritionItems()
      setItems(data)
    } catch (error) {
      console.error('Error loading nutrition items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      alert('Please enter a nutrition item name')
      return
    }

    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('nutrition_library')
        .insert([{ name: newItemName.trim() }])
        .select()
        .single()

      if (error) throw error

      setItems([...items, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewItemName('')
      setAddDialogOpen(false)
    } catch (error) {
      console.error('Error adding nutrition item:', error)
      alert('Error adding nutrition item. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from('nutrition_library')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      setItems(items.filter(item => item.id !== itemToDelete.id))
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error deleting nutrition item:', error)
      alert('Error deleting nutrition item. Please try again.')
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-8 bg-background text-foreground min-h-screen">
        <p className="text-muted-foreground">Loading nutrition items...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Nutrition Library</h1>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search nutrition items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input text-foreground border-border placeholder-muted-foreground"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="bg-card border border-border rounded-lg">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No nutrition items found matching your search.' : 'No nutrition items in library. Add your first item!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="text-foreground font-medium">{item.name}</span>
                <button
                  onClick={() => {
                    setItemToDelete(item)
                    setDeleteDialogOpen(true)
                  }}
                  className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-md transition-colors"
                  title="Delete nutrition item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Nutrition Item</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the name of the nutrition item to add to your library.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Nutrition item name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem()
                }
              }}
              className="bg-input text-foreground border-border placeholder-muted-foreground"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setAddDialogOpen(false)
                setNewItemName('')
              }}
              variant="outline"
              className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={adding || !newItemName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {adding ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Nutrition Item</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
              variant="outline"
              className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


