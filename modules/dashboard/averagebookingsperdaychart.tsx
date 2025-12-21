'use client'

import React, { useState, useEffect } from 'react'
import { fetchAverageBookingsPerDay } from '@/supabase/fetches/fetchaveragebookingsperday'

type AverageBookingsPerDayChartProps = {
  // This component will fetch its own data
}

export default function AverageBookingsPerDayChart({}: AverageBookingsPerDayChartProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week')
  const [averageBookings, setAverageBookings] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const days = timeframe === 'week' ? 7 : 30
        const avg = await fetchAverageBookingsPerDay(days)
        setAverageBookings(avg)
      } catch (error) {
        console.error('Error loading average bookings per day:', error)
        setAverageBookings(0)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [timeframe])

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Avg Bookings/Day</h3>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <div className="text-center w-full">
            <div className="text-5xl font-bold text-orange-500">{averageBookings.toFixed(1)}</div>
            <div className="text-xs text-gray-400 mt-2 mb-4">
              Average per day ({timeframe === 'week' ? 'past 7 days' : 'past 30 days'})
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setTimeframe('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${
                  timeframe === 'week'
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333333]'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${
                  timeframe === 'month'
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333333]'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

