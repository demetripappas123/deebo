'use client'

import { useEffect, useState } from 'react'
import { fetchExercisesPaginated, ExerciseLibraryItem } from '@/supabase/fetches/fetchexlib'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const INITIAL_PAGE_SIZE = 10

export default function ExerciseList() {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadExercises()
  }, [currentPage, searchQuery])

  const loadExercises = async () => {
    setLoading(true)
    try {
      const pageSize = searchActive ? 100 : INITIAL_PAGE_SIZE
      
      const result = await fetchExercisesPaginated(
        currentPage,
        pageSize,
        searchActive ? searchQuery : undefined
      )
      
      if (searchActive && currentPage === 1) {
        // If starting search, replace all exercises
        setExercises(result.exercises)
      } else if (searchActive && currentPage > 1) {
        // If continuing search pagination, append
        setExercises((prev) => [...prev, ...result.exercises])
      } else {
        // Initial load or regular pagination, replace
        setExercises(result.exercises)
      }
      
      setHasMore(result.hasMore)
      setTotal(result.total)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFocus = () => {
    if (!searchActive && searchQuery.trim()) {
      // When search bar is selected/activated, start loading all matching exercises
      setSearchActive(true)
      setCurrentPage(1)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    if (value.trim()) {
      setSearchActive(true)
    } else {
      setSearchActive(false)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && searchActive) {
      // In search mode, append next page
      setCurrentPage(currentPage + 1)
    }
  }

  if (loading && exercises.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading exercises...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            className="pl-10 bg-input text-foreground border-border placeholder-muted-foreground"
          />
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="bg-card border border-border rounded-lg">
        {exercises.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No exercises found matching your search.' : 'No exercises in library.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {/* Exercise Image/Video/GIF */}
                  <div className="mb-3 aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {exercise.gif_url ? (
                      <img
                        src={exercise.gif_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                      />
                    ) : exercise.video_url ? (
                      <video
                        src={exercise.video_url}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                    ) : exercise.img_url ? (
                      <img
                        src={exercise.img_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground text-sm">No media</div>
                    )}
                  </div>

                  {/* Exercise Name */}
                  <h3 className="text-foreground font-medium mb-2">{exercise.name}</h3>

                  {/* Variations */}
                  {exercise.variations && exercise.variations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Variations:</p>
                      <div className="flex flex-wrap gap-1">
                        {exercise.variations.map((variation, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-muted text-foreground rounded"
                          >
                            {variation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {!searchActive && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                  variant="outline"
                  className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {currentPage} {total > 0 && `(${total} total)`}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={!hasMore || loading}
                  variant="outline"
                  className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Load More for Search Mode */}
            {searchActive && hasMore && (
              <div className="p-4 border-t border-border text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  {loading ? 'Loading...' : `Load More (${total - exercises.length} remaining)`}
                </Button>
              </div>
            )}

            {/* Search Results Count */}
            {searchActive && (
              <div className="p-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Showing {exercises.length} of {total} results
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

