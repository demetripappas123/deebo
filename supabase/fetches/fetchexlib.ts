import { supabase } from '@/supabase/supabaseClient'

export type ExerciseLibraryItem = {
  id: string
  name: string
  video_url: string | null
  gif_url: string | null
  img_url: string | null
  variations: string[] | null
  created_at: string
}

export async function fetchExercises(): Promise<ExerciseLibraryItem[]> {
  try {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data as ExerciseLibraryItem[]
  } catch (err) {
    console.error('Error fetching exercises:', err)
    return []
  }
}

/**
 * Fetch exercises with pagination support
 * @param page - 1-based page number (default: 1)
 * @param pageSize - Number of exercises per page (default: 10)
 * @param searchQuery - Optional search query to filter by name
 */
export async function fetchExercisesPaginated(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string
): Promise<{
  exercises: ExerciseLibraryItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}> {
  try {
    let query = supabase
      .from('exercise_library')
      .select('*', { count: 'exact' })

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    // Apply pagination and ordering
    const offset = (page - 1) * pageSize
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    // Execute query - count and data are returned together
    const { data, error, count } = await query

    if (error) throw error

    const total = count || 0
    const hasMore = offset + (data?.length || 0) < total

    return {
      exercises: (data || []) as ExerciseLibraryItem[],
      total,
      page,
      pageSize,
      hasMore,
    }
  } catch (err) {
    console.error('Error fetching exercises with pagination:', err)
    return {
      exercises: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    }
  }
}
