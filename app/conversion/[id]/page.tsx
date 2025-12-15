'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchPersonById } from '@/supabase/fetches/fetchpeople'
import { upsertClient } from '@/supabase/upserts/upsertperson'
import { Person } from '@/supabase/fetches/fetchpeople'

export default function ConversionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPerson = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      try {
        const personData = await fetchPersonById(id)
        if (!personData) {
          setError('Person not found')
          setLoading(false)
          return
        }

        // Check if person is already a client
        if (personData.converted_at !== null) {
          setError('This person is already a client')
          setLoading(false)
          return
        }

        setPerson(personData)
      } catch (err) {
        console.error('Error loading person:', err)
        setError('Failed to load person data')
      } finally {
        setLoading(false)
      }
    }

    loadPerson()
  }, [id])

  const handleConvertToClient = async () => {
    if (!person) return

    setConverting(true)
    try {
      // Convert prospect to client by setting converted_at to current time
      await upsertClient({
        id: person.id,
        name: person.name,
        number: person.number || undefined,
        notes: person.notes || undefined,
        program_id: person.program_id || undefined,
        converted_at: new Date().toISOString(),
      })

      // Redirect to the person's page
      router.push(`/people/${person.id}`)
    } catch (err) {
      console.error('Error converting prospect to client:', err)
      setError('Failed to convert prospect to client. Please try again.')
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Loading...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/people')}
            className="px-4 py-2 bg-[#333333] hover:bg-[#404040] text-white rounded-md cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </main>
    )
  }

  if (!person) {
    return (
      <main className="p-8 text-white bg-[#111111] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Person not found</p>
          <button
            onClick={() => router.push('/people')}
            className="px-4 py-2 bg-[#333333] hover:bg-[#404040] text-white rounded-md cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8 text-white bg-[#111111] min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Convert Prospect to Client</h1>

        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Prospect Information</h2>
          <div className="space-y-2 text-gray-300">
            <p>
              <span className="font-semibold text-white">Name:</span> {person.name}
            </p>
            {person.number && (
              <p>
                <span className="font-semibold text-white">Number:</span> {person.number}
              </p>
            )}
            {person.notes && (
              <p>
                <span className="font-semibold text-white">Notes:</span> {person.notes}
              </p>
            )}
          </div>
        </div>

        <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-4 mb-6">
          <p className="text-green-400">
            <strong>Info:</strong> Converting this prospect to a client will enable nutrition tracking and full client features. 
            This action can be reversed by converting them back to a prospect later.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/people/${person.id}`)}
            className="px-6 py-3 bg-[#333333] hover:bg-[#404040] text-white rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConvertToClient}
            disabled={converting}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md cursor-pointer disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {converting ? 'Converting...' : 'Convert to Client'}
          </button>
        </div>
      </div>
    </main>
  )
}

