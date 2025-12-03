'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { Client } from '@/supabase/fetches/fetchclients'
import { fetchClientNutritionEntries, NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { updateNutritionEntries } from '@/supabase/upserts/upsertnutrition'
import { fetchClientNutritionGoals, NutritionGoal } from '@/supabase/fetches/fetchnutritiongoals'
import EditNutrition from '@/modules/clients/editnutrition'
import NutritionChart from '@/modules/clients/nutritionchart'
import CompactNutritionGoals from '@/modules/clients/compactnutritiongoals'

export default function ClientPage() {
  const params = useParams()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([])
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)

  useEffect(() => {
    const loadClient = async () => {
      const clientId = params.id
      if (!clientId) return setLoading(false)

      setLoading(true)
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single()

        if (clientError) {
          console.error('Error loading client:', clientError)
          setClient(null)
        } else {
          setClient(clientData)
          
          // Fetch nutrition entries for this client
          try {
            const nutritionData = await fetchClientNutritionEntries(clientData.id)
            setNutritionEntries(nutritionData || [])
          } catch (err) {
            console.error('Error loading nutrition entries:', err)
            setNutritionEntries([])
          }

          // Fetch nutrition goals for this client
          try {
            const goalsData = await fetchClientNutritionGoals(clientData.id)
            setNutritionGoals(goalsData || [])
          } catch (err) {
            console.error('Error loading nutrition goals:', err)
            setNutritionGoals([])
          }
        }
      } catch (err) {
        console.error('Unexpected error loading client:', err)
        setClient(null)
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [params.id])

  const handleSaveNutrition = async (
    entries: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!client) return

    try {
      const updated = await updateNutritionEntries(client.id, entries)
      if (updated) {
        setNutritionEntries(updated)
        setIsEditingNutrition(false)
      }
    } catch (err) {
      console.error('Failed to save nutrition entries:', err)
      throw err
    }
  }

  if (loading) return <p className="text-gray-300">Loading client...</p>
  if (!client) return <p className="text-gray-300">Client not found.</p>

  return (
    <div className="p-6 space-y-4 bg-[#111111] min-h-screen text-white">
      <button
        onClick={() => router.back()}
        className="px-3 py-1 bg-[#333333] rounded-md hover:bg-[#404040] cursor-pointer"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-4">{client.name}</h1>

      {/* Nutrition Goals */}
      <div className="p-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Nutrition Goals</h2>
        </div>
        <CompactNutritionGoals
          clientId={client.id}
          initialGoals={nutritionGoals}
          onUpdate={async () => {
            if (client) {
              try {
                const goalsData = await fetchClientNutritionGoals(client.id)
                setNutritionGoals(goalsData || [])
              } catch (err) {
                console.error('Error refreshing nutrition goals:', err)
              }
            }
          }}
        />
      </div>

      <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Nutrition</h2>
          {!isEditingNutrition && (
            <button
              onClick={() => setIsEditingNutrition(true)}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 rounded-md cursor-pointer text-white text-sm"
            >
              Edit Nutrition Information
            </button>
          )}
        </div>

        {isEditingNutrition ? (
          <EditNutrition
            clientId={client.id}
            initialEntries={nutritionEntries}
            onSave={handleSaveNutrition}
            onCancel={() => setIsEditingNutrition(false)}
          />
        ) : (
          <NutritionChart entries={nutritionEntries} />
        )}
      </div>
    </div>
  )
}

