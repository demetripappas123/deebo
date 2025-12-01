import { supabase } from '@/supabase/supabaseClient'
import { NutritionEntry } from '@/supabase/fetches/fetchnutrition'

/**
 * Inserts nutrition entries for a client (for new entries).
 */
export async function upsertNutritionEntries(
  entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]
): Promise<NutritionEntry[] | null> {
  if (!entries.length) return null

  try {
    const formattedEntries = entries.map(entry => ({
      client_id: entry.client_id,
      entry_date: entry.entry_date,
      calories: entry.calories ?? null,
      protein_grams: entry.protein_grams ?? null,
      carbs_grams: entry.carbs_grams ?? null,
      fats_grams: entry.fats_grams ?? null,
    }))

    const { data, error } = await supabase
      .from('nutrition_entries')
      .insert(formattedEntries)
      .select('*')

    if (error) {
      console.error('upsertNutritionEntries error:', error)
      throw error
    }
    return data as NutritionEntry[]
  } catch (err) {
    console.error('upsertNutritionEntries error:', err)
    return null
  }
}

/**
 * Intelligently updates nutrition entries for a client by:
 * 1. Fetching existing entries
 * 2. Updating existing entries that match by entry_date
 * 3. Inserting new entries that don't exist
 * 4. Deleting entries that were removed from the list
 */
export async function updateNutritionEntries(
  clientId: string,
  entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]
): Promise<NutritionEntry[] | null> {
  try {
    // Fetch all existing entries for this client
    const { data: existingEntries, error: fetchError } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('client_id', clientId)

    if (fetchError) {
      console.error('updateNutritionEntries fetch error:', fetchError)
      throw fetchError
    }

    // Create a map of existing entries by entry_date for quick lookup
    const existingMap = new Map<string, any>()
    existingEntries?.forEach(entry => {
      existingMap.set(entry.entry_date, entry)
    })

    // Track which entry_dates should exist after update
    const newEntryDates = new Set(entries.map(e => e.entry_date))

    // Separate entries into updates and inserts
    const toUpdate: any[] = []
    const toInsert: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[] = []

    entries.forEach(entry => {
      const formatted = {
        client_id: entry.client_id,
        entry_date: entry.entry_date,
        calories: entry.calories ?? null,
        protein_grams: entry.protein_grams ?? null,
        carbs_grams: entry.carbs_grams ?? null,
        fats_grams: entry.fats_grams ?? null,
      }

      // Check if this entry already exists (by entry_date)
      const existing = existingMap.get(entry.entry_date)
      if (existing) {
        // Update existing entry
        toUpdate.push(formatted)
      } else {
        // Insert new entry
        toInsert.push(formatted)
      }
    })

    // Delete entries that exist in DB but not in the new list
    const toDelete: string[] = []
    existingEntries?.forEach(entry => {
      if (!newEntryDates.has(entry.entry_date)) {
        toDelete.push(entry.entry_date)
      }
    })

    // Perform updates, inserts, and deletes in parallel
    const promises: (Promise<any> | PromiseLike<any>)[] = []

    // Update existing entries one by one
    toUpdate.forEach(entry => {
      promises.push(
        supabase
          .from('nutrition_entries')
          .update({
            calories: entry.calories,
            protein_grams: entry.protein_grams,
            carbs_grams: entry.carbs_grams,
            fats_grams: entry.fats_grams,
          })
          .eq('client_id', clientId)
          .eq('entry_date', entry.entry_date)
          .select()
          .then(result => {
            if (result.error) throw result.error
            return result
          })
      )
    })

    // Insert new entries
    if (toInsert.length > 0) {
      promises.push(
        supabase
          .from('nutrition_entries')
          .insert(toInsert)
          .select()
          .then(result => {
            if (result.error) throw result.error
            return result
          })
      )
    }

    // Delete removed entries
    if (toDelete.length > 0) {
      promises.push(
        supabase
          .from('nutrition_entries')
          .delete()
          .eq('client_id', clientId)
          .in('entry_date', toDelete)
          .then(result => {
            if (result.error) throw result.error
            return { data: [], error: null }
          })
      )
    }

    const results = await Promise.all(promises)

    // Check for errors
    for (const result of results) {
      if (result?.error) {
        console.error('updateNutritionEntries operation error:', result.error)
        throw result.error
      }
    }

    // Fetch and return the updated entries
    const { data: updatedEntries, error: finalFetchError } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('entry_date', { ascending: false })

    if (finalFetchError) {
      console.error('updateNutritionEntries final fetch error:', finalFetchError)
      throw finalFetchError
    }

    return updatedEntries as NutritionEntry[]
  } catch (err) {
    console.error('updateNutritionEntries error:', err)
    return null
  }
}

