'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { SessionWithExercises } from '@/supabase/fetches/fetchsessions'

type WorkoutVolumeChartProps = {
  sessions: SessionWithExercises[]
}

type VolumeDataPoint = {
  date: string
  volume: number
  formattedDate: string
  color: string
}

export default function WorkoutVolumeChart({ sessions }: WorkoutVolumeChartProps) {
  const [daysView, setDaysView] = useState<30 | 60 | 90>(30)

  // Calculate volume for each session
  const calculateSessionVolume = (session: SessionWithExercises): number => {
    if (!session.exercises || session.exercises.length === 0) return 0

    let totalVolume = 0
    for (const exercise of session.exercises) {
      if (exercise.sets && exercise.sets.length > 0) {
        for (const set of exercise.sets) {
          const weight = set.weight ?? 0
          const reps = set.reps ?? 0
          totalVolume += weight * reps
        }
      }
    }
    return totalVolume
  }

  // Process data for the selected time period
  const chartData = useMemo(() => {
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - daysView)

    // Filter sessions within the time period and calculate volume
    // Use started_at if available (sessions that have started), otherwise start_time (scheduled)
    const sessionsWithVolume = sessions
      .filter((session) => {
        const sessionDate = session.started_at 
          ? new Date(session.started_at) 
          : session.start_time 
          ? new Date(session.start_time)
          : null
        if (!sessionDate) return false
        return sessionDate >= cutoffDate && sessionDate <= now
      })
      .map((session) => {
        const volume = calculateSessionVolume(session)
        const date = session.started_at 
          ? new Date(session.started_at) 
          : session.start_time 
          ? new Date(session.start_time)
          : new Date()
        return {
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          volume,
          timestamp: date.getTime(),
        }
      })
      .filter((item) => item.volume > 0) // Only include sessions with volume
      .sort((a, b) => a.timestamp - b.timestamp)

    // Group by date and sum volumes for the same day
    const volumeByDate = new Map<string, number>()
    for (const item of sessionsWithVolume) {
      const existing = volumeByDate.get(item.date) || 0
      volumeByDate.set(item.date, existing + item.volume)
    }

    // Convert to array and format for chart
    const sortedData = Array.from(volumeByDate.entries())
      .map(([date, volume]) => {
        const dateObj = new Date(date)
        return {
          date,
          volume: Math.round(volume), // Round to nearest whole number
          formattedDate: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Add candlestick coloring based on trend
    const data: VolumeDataPoint[] = sortedData.map((point, index) => {
      // Determine color based on trend (candlestick style)
      if (index === 0) {
        // First point defaults to green
        return { ...point, color: '#10b981' }
      }
      
      const prevVolume = sortedData[index - 1].volume
      if (point.volume > prevVolume) {
        // Increasing - green
        return { ...point, color: '#10b981' }
      } else if (point.volume < prevVolume) {
        // Decreasing - red (first bar in decreasing trend)
        return { ...point, color: '#ef4444' }
      } else {
        // Same volume - keep previous color
        const prevColor = data[index - 1]?.color || '#10b981'
        return { ...point, color: prevColor }
      }
    })

    return data
  }, [sessions, daysView])

  const formatVolume = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  return (
    <div className="space-y-4">
      {/* View Toggle Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setDaysView(30)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysView === 30
              ? 'bg-orange-500 text-white'
              : 'bg-[#333333] text-gray-300 hover:bg-[#404040]'
          } cursor-pointer`}
        >
          30 Days
        </button>
        <button
          onClick={() => setDaysView(60)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysView === 60
              ? 'bg-orange-500 text-white'
              : 'bg-[#333333] text-gray-300 hover:bg-[#404040]'
          } cursor-pointer`}
        >
          60 Days
        </button>
        <button
          onClick={() => setDaysView(90)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysView === 90
              ? 'bg-orange-500 text-white'
              : 'bg-[#333333] text-gray-300 hover:bg-[#404040]'
          } cursor-pointer`}
        >
          90 Days
        </button>
      </div>

      {/* Chart */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Total Workout Volume</h3>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>No workout data available for the selected period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="formattedDate"
                stroke="#888888"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#888888"
                style={{ fontSize: '12px' }}
                tickFormatter={formatVolume}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#ffffff',
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString()} lbs`,
                  'Volume',
                ]}
                labelStyle={{ color: '#ffffff' }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="volume"
                radius={[2, 2, 0, 0]}
                style={{ cursor: 'pointer' }}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

