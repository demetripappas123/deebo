import { supabase } from '@/supabase/supabaseClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  try {
    const { id } = await params // ✅ await params here

    // Fetch event data from Supabase
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !event) return notFound()

  return (
    <main className="p-8 text-white bg-[#111111] min-h-screen">
      <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

      <div className="space-y-2 text-gray-300">
        <p>
          <span className="font-semibold text-white">Type:</span> {event.type}
        </p>
        <p>
          <span className="font-semibold text-white">Date:</span> {new Date(event.start_time).toLocaleString()}
        </p>
        <p>
          <span className="font-semibold text-white">Duration:</span> {event.duration_minutes} minutes
        </p>
        <p>
          <span className="font-semibold text-white">Status:</span> {event.status}
        </p>
      </div>

      {/* 🔜 Future expansion: exercises, rest timers, set tracking */}
      <div className="mt-8 p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
        <h2 className="text-2xl font-semibold mb-2">Session Details</h2>
        <p className="text-gray-300">Coming soon...</p>
      </div>
    </main>
    )
  } catch (error) {
    console.error('Error loading event:', error)
    return notFound()
  }
}
