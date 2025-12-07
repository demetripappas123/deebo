'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { SessionWithExercises } from '@/supabase/fetches/fetchsessions'

type RPERIRChartProps = {
  sessions: SessionWithExercises[]
}

type RPERIRDataPoint = {
  date: string
  average: number
  formattedDate: string
  count: number // number of sets used in calculation
}

export default function RPERIRChart({ sessions }: RPERIRChartProps) {
  const [daysView, setDaysView] = useState<30 | 60 | 90>(30)
  const [metricType, setMetricType] = useState<'RPE' | 'RIR'>('RPE')

  // Calculate average RPE or RIR for a session
  const calculateSessionAverage = (session: SessionWithExercises, type: 'RPE' | 'RIR'): { average: number; count: number } => {
    if (!session.exercises || session.exercises.length === 0) {
      return { average: 0, count: 0 }
    }

    let total = 0
    let count = 0

    for (const exercise of session.exercises) {
      if (exercise.sets && exercise.sets.length > 0) {
        for (const set of exercise.sets) {
          const value = type === 'RPE' ? set.rpe : set.rir
          if (value !== null && value !== undefined) {
            total += value
            count++
          }
        }
      }
    }

    if (count === 0) {
      return { average: 0, count: 0 }
    }

    return { average: total / count, count }
  }

  // Process data for the selected time period
  const chartData = useMemo(() => {
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - daysView)

    // Filter sessions within the time period and calculate averages
    const sessionsWithAverage = sessions
      .filter((session) => {
        if (!session.start_time) return false
        const sessionDate = new Date(session.start_time)
        return sessionDate >= cutoffDate && sessionDate <= now
      })
      .map((session) => {
        const { average, count } = calculateSessionAverage(session, metricType)
        const date = session.start_time ? new Date(session.start_time) : new Date()
        return {
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          average,
          count,
          timestamp: date.getTime(),
        }
      })
      .filter((item) => item.count > 0) // Only include sessions with data for the selected metric
      .sort((a, b) => a.timestamp - b.timestamp)

    // Group by date and calculate weighted average for the same day
    const averageByDate = new Map<string, { total: number; totalCount: number }>()
    for (const item of sessionsWithAverage) {
      const existing = averageByDate.get(item.date) || { total: 0, totalCount: 0 }
      averageByDate.set(item.date, {
        total: existing.total + (item.average * item.count),
        totalCount: existing.totalCount + item.count,
      })
    }

    // Helper function to calculate color based on RPE/RIR value
    const getColorForValue = (value: number): string => {
      if (metricType === 'RPE') {
        // RPE: Green at low values, yellow/orange transition from 8.5-9, red at 9+
        if (value >= 9) {
          return '#ef4444' // Red
        } else if (value >= 8.5) {
          // Interpolate from yellow to orange to red (8.5-9)
          const ratio = (value - 8.5) / 0.5 // 0 at 8.5, 1 at 9
          if (ratio < 0.5) {
            // Yellow (#eab308) to Orange (#f97316)
            const subRatio = ratio * 2
            const r = Math.round(234 + (249 - 234) * subRatio)
            const g = Math.round(179 + (115 - 179) * subRatio)
            const b = Math.round(8 + (22 - 8) * subRatio)
            return `rgb(${r}, ${g}, ${b})`
          } else {
            // Orange (#f97316) to Red (#ef4444)
            const subRatio = (ratio - 0.5) * 2
            const r = Math.round(249 + (239 - 249) * subRatio)
            const g = Math.round(115 + (68 - 115) * subRatio)
            const b = Math.round(22 + (68 - 22) * subRatio)
            return `rgb(${r}, ${g}, ${b})`
          }
        } else {
          // Green gradient for values below 8.5 (5 to 8.5)
          const ratio = (value - 5) / 3.5 // 0 at 5, 1 at 8.5
          // Light green (#22c55e) to darker green/yellow-green (#16a34a)
          const r = Math.round(34 - (22 - 34) * ratio)
          const g = Math.round(197 - (163 - 197) * ratio)
          const b = Math.round(94 - (52 - 94) * ratio)
          return `rgb(${r}, ${g}, ${b})`
        }
      } else {
        // RIR: Reverse logic (lower RIR = higher intensity = more red)
        if (value <= 0) {
          return '#ef4444' // Red (very low RIR)
        } else if (value <= 1) {
          return '#f97316' // Orange
        } else if (value <= 2) {
          return '#eab308' // Yellow
        } else {
          return '#22c55e' // Green for higher RIR
        }
      }
    }

    // Convert to array and format for chart
    const data: RPERIRDataPoint[] = Array.from(averageByDate.entries())
      .map(([date, { total, totalCount }]) => {
        const dateObj = new Date(date)
        const average = total / totalCount // Weighted average
        return {
          date,
          average,
          count: totalCount,
          formattedDate: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          color: getColorForValue(average),
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return data
  }, [sessions, daysView, metricType])

  const formatValue = (value: number) => {
    return value.toFixed(1)
  }

  return (
    <div className="space-y-4">
      {/* View Toggle Buttons */}
      <div className="flex items-center justify-between">
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

        {/* Metric Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMetricType('RPE')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              metricType === 'RPE'
                ? 'bg-orange-500 text-white'
                : 'bg-[#333333] text-gray-300 hover:bg-[#404040]'
            } cursor-pointer`}
          >
            RPE
          </button>
          <button
            onClick={() => setMetricType('RIR')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              metricType === 'RIR'
                ? 'bg-orange-500 text-white'
                : 'bg-[#333333] text-gray-300 hover:bg-[#404040]'
            } cursor-pointer`}
          >
            RIR
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Average {metricType} per Workout
        </h3>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>No {metricType} data available for the selected period.</p>
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
                tickFormatter={formatValue}
                domain={metricType === 'RPE' ? [5, 10] : [0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#ffffff',
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(value: number) => [
                  `${value.toFixed(2)}`,
                  `Avg ${metricType}`,
                ]}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="average"
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

