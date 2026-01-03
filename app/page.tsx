'use client'

import React, { useEffect, useState } from 'react'
import { fetchDashboardMetricsProgressive } from '@/supabase/fetches/fetchdashboardmetrics'
import CloseRateChart from '@/modules/dashboard/closeratechart'
import ShowRateChart from '@/modules/dashboard/showratechart'
import AverageBookingsChart from '@/modules/dashboard/averagebookingschart'
import RevenueChart from '@/modules/dashboard/revenuechart'
import HourlyAverageChart from '@/modules/dashboard/hourlyaveragechart'
import ChartSkeleton from '@/modules/dashboard/chartskeleton'

export default function Home() {
  const [closeRate, setCloseRate] = useState<number | null>(null)
  const [showRate, setShowRate] = useState<number | null>(null)
  const [averageBookings, setAverageBookings] = useState<number | null>(null)
  const [revenue, setRevenue] = useState<number | null>(null)
  const [hourlyAverage, setHourlyAverage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setError(null)
        const metrics = await fetchDashboardMetricsProgressive()

        // Load all metrics in parallel, update state as each completes
        metrics.closeRate
          .then(value => setCloseRate(value))
          .catch(err => console.error('Error loading close rate:', err))
        
        metrics.showRate
          .then(value => setShowRate(value))
          .catch(err => console.error('Error loading show rate:', err))
        
        metrics.averageBookings
          .then(value => setAverageBookings(value))
          .catch(err => console.error('Error loading average bookings:', err))
        
        metrics.revenue
          .then(value => setRevenue(value))
          .catch(err => console.error('Error loading revenue:', err))
        
        metrics.hourlyAverage
          .then(value => setHourlyAverage(value))
          .catch(err => console.error('Error loading hourly average:', err))
      } catch (err) {
        console.error('Error loading dashboard metrics:', err)
        setError('Failed to load dashboard metrics')
      }
    }

    loadMetrics()
  }, [])

  if (error) {
    return (
      <div className="w-full h-full bg-background text-foreground p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-background text-foreground p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Close Rate - Circular Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          {closeRate !== null ? (
            <CloseRateChart closeRate={closeRate} />
          ) : (
            <ChartSkeleton type="circular" title="Close Rate" />
          )}
        </div>

        {/* Show Rate - Circular Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          {showRate !== null ? (
            <ShowRateChart showRate={showRate} />
          ) : (
            <ChartSkeleton type="circular" title="Show Rate" />
          )}
        </div>

        {/* Average Bookings */}
        <div className="bg-card border border-border rounded-lg p-4 min-h-[300px]">
          {averageBookings !== null ? (
            <AverageBookingsChart averageBookings={averageBookings} />
          ) : (
            <ChartSkeleton type="number" title="Today's Bookings" />
          )}
        </div>

        {/* Revenue */}
        <div className="bg-card border border-border rounded-lg p-4 min-h-[200px]">
          {revenue !== null ? (
            <RevenueChart revenue={revenue} />
          ) : (
            <ChartSkeleton type="number" title="Revenue" />
          )}
        </div>

        {/* Hourly Average */}
        <div className="bg-card border border-border rounded-lg p-4 min-h-[200px]">
          {hourlyAverage !== null ? (
            <HourlyAverageChart hourlyAverage={hourlyAverage} />
          ) : (
            <ChartSkeleton type="number" title="Hourly Rate" />
          )}
        </div>
      </div>
    </div>
  )
}
