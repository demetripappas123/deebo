'use client'

import React, { useEffect, useState } from 'react'
import { fetchDashboardMetrics, DashboardMetrics } from '@/supabase/fetches/fetchdashboardmetrics'
import CloseRateChart from '@/modules/dashboard/closeratechart'
import ShowRateChart from '@/modules/dashboard/showratechart'
import AverageBookingsChart from '@/modules/dashboard/averagebookingschart'
import AverageBookingsPerDayChart from '@/modules/dashboard/averagebookingsperdaychart'
import RevenueChart from '@/modules/dashboard/revenuechart'
import HourlyAverageChart from '@/modules/dashboard/hourlyaveragechart'
import MTDRevenueChart from '@/modules/dashboard/mtdrevenuechart'
import ProjectedRevenueChart from '@/modules/dashboard/projectedrevenuechart'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true)
        const data = await fetchDashboardMetrics()
        setMetrics(data)
        setError(null)
      } catch (err) {
        console.error('Error loading dashboard metrics:', err)
        setError('Failed to load dashboard metrics')
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="w-full h-full bg-[#111111] text-white p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading metrics...</div>
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="w-full h-full bg-[#111111] text-white p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">{error || 'Failed to load metrics'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#111111] text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Top Row: MTD Revenue, Projected Revenue, Hourly Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* MTD Revenue */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <MTDRevenueChart mtdRevenue={metrics.mtdRevenue} />
        </div>

        {/* Projected Revenue */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <ProjectedRevenueChart projectedRevenue={metrics.projectedRevenue} />
        </div>

        {/* Hourly Average */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <HourlyAverageChart hourlyAverage={metrics.hourlyAverage} />
        </div>
      </div>

      {/* Bottom Row: All Other Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Trained Revenue - Moved to leftmost position */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <RevenueChart revenue={metrics.trainedRevenue} />
        </div>

        {/* Close Rate - Circular Chart */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4">
          <CloseRateChart closeRate={metrics.closeRate} />
        </div>

        {/* Show Rate - Circular Chart */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4">
          <ShowRateChart showRate={metrics.showRate} />
        </div>

        {/* Today's Bookings */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <AverageBookingsChart averageBookings={metrics.averageBookings} />
        </div>

        {/* Average Bookings Per Day */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-4 min-h-[200px]">
          <AverageBookingsPerDayChart />
        </div>
      </div>
    </div>
  )
}
