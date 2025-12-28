// modules/sidebar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { Settings } from 'lucide-react'
import { supabase } from '@/supabase/supabaseClient'

export default function Sidebar() {
  const router = useRouter()

  const handleBusinessGoalsClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      // Fetch first trainer goal record from trainer_goals table
      const { data: trainerGoals, error: trainerGoalsError } = await supabase
        .from('trainer_goals')
        .select('id')
        .limit(1)

      if (trainerGoalsError) {
        console.error('Error fetching trainer goals:', trainerGoalsError)
        alert('Error loading trainer goals. Please make sure the trainer_goals table exists.')
        return
      }

      if (!trainerGoals || trainerGoals.length === 0) {
        alert('No trainer goals found. Please create a trainer goal record first.')
        return
      }

      // Navigate to first trainer goal's page
      router.push(`/trainer/${trainerGoals[0].id}/goals`)
    } catch (err) {
      console.error('Error fetching trainer goals:', err)
      alert('Error loading trainer goals. Please try again.')
    }
  }

  return (
    <aside className="w-64 bg-[#181818] text-white shadow-lg border-r border-[#2a2a2a]">
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-[#2a2a2a]">
          <Link href="/">
            <span className="text-2xl font-bold text-white">
              TurboTrain
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <div className="flex-1 space-y-2">
            <Link
              href="/dash"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/clients"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Clients</span>
            </Link>
            <Link
              href="/prospects"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Prospects</span>
            </Link>
            <Link
              href="/calendar"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Calendar</span>
            </Link>
            <Link
              href="/programs"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Programs</span>
            </Link>
            <Link
              href="/payments"
              className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Payments</span>
            </Link>
            <button
              onClick={handleBusinessGoalsClick}
              className="w-full flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
            >
              <span className="font-medium">Business Goals</span>
            </button>
          </div>
          <Link
            href="/settings"
            className="flex items-center justify-between gap-2 px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors mt-auto"
          >
            <span className="font-medium">Settings</span>
            <Settings className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </aside>
  )
}
