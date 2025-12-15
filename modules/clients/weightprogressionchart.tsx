'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { SessionWithExercises } from '@/supabase/fetches/fetchsessions'
import { fetchExercises } from '@/supabase/fetches/fetchexlib'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

type WeightProgressionChartProps = {
  sessions: SessionWithExercises[]
}

type ExerciseDataPoint = {
  date: string
  formattedDate: string
  timestamp: number
  [exerciseName: string]: string | number // Dynamic keys for each exercise
}

const DEFAULT_EXERCISES = ['Squat', 'Bench Press', 'Deadlift']

export default function WeightProgressionChart({ sessions }: WeightProgressionChartProps) {
  const [selectedExercises, setSelectedExercises] = useState<string[]>(DEFAULT_EXERCISES)
  const [daysView, setDaysView] = useState<30 | 60 | 90>(90)
  const [exerciseLibrary, setExerciseLibrary] = useState<{ id: string; name: string }[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Load exercise library
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const exercises = await fetchExercises()
        setExerciseLibrary(exercises)
      } catch (err) {
        console.error('Failed to fetch exercises:', err)
      }
    }
    loadExercises()
  }, [])

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!searchValue.trim()) return []
    const searchLower = searchValue.toLowerCase()
    return exerciseLibrary
      .filter((ex) => ex.name.toLowerCase().includes(searchLower))
      .slice(0, 10) // Limit to 10 results
  }, [exerciseLibrary, searchValue])

  const addExercise = (exerciseName: string) => {
    if (!selectedExercises.includes(exerciseName)) {
      setSelectedExercises([...selectedExercises, exerciseName])
    }
    setSearchValue('')
    setSearchOpen(false)
  }

  const removeExercise = (exerciseName: string) => {
    setSelectedExercises(selectedExercises.filter((name) => name !== exerciseName))
  }

  // Process data for weight progression
  const chartData = useMemo(() => {
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - daysView)

      // Filter sessions within the time period
      // Use started_at if available (sessions that have started), otherwise start_time (scheduled)
      const relevantSessions = sessions.filter((session) => {
        const sessionDate = session.started_at 
          ? new Date(session.started_at) 
          : session.start_time 
          ? new Date(session.start_time)
          : null
        if (!sessionDate) return false
        return sessionDate >= cutoffDate && sessionDate <= now
      })

      // For each selected exercise, find max weight per day
      const exerciseDataByDate = new Map<string, Map<string, number>>()

      for (const session of relevantSessions) {
        if (!session.exercises) continue
        const sessionDate = session.started_at 
          ? new Date(session.started_at) 
          : session.start_time 
          ? new Date(session.start_time)
          : null
        if (!sessionDate) continue
        const dateKey = sessionDate.toISOString().split('T')[0]

      for (const exercise of session.exercises) {
        const exerciseName = exercise.exercise_name || ''
        
        // Check if this exercise matches any selected exercise (case-insensitive)
        const matchingExercise = selectedExercises.find(
          (selected) => exerciseName.toLowerCase().includes(selected.toLowerCase()) ||
                       selected.toLowerCase().includes(exerciseName.toLowerCase())
        )

        if (matchingExercise && exercise.sets && exercise.sets.length > 0) {
          // Find max weight for this exercise in this session
          let maxWeight = 0
          for (const set of exercise.sets) {
            if (set.weight && set.weight > maxWeight) {
              maxWeight = set.weight
            }
          }

          if (maxWeight > 0) {
            if (!exerciseDataByDate.has(dateKey)) {
              exerciseDataByDate.set(dateKey, new Map())
            }
            const exerciseMap = exerciseDataByDate.get(dateKey)!
            const currentMax = exerciseMap.get(matchingExercise) || 0
            if (maxWeight > currentMax) {
              exerciseMap.set(matchingExercise, maxWeight)
            }
          }
        }
      }
    }

    // Convert to chart data format
    const dataPoints: ExerciseDataPoint[] = Array.from(exerciseDataByDate.entries())
      .map(([date, exerciseMap]) => {
        const dateObj = new Date(date)
        const point: ExerciseDataPoint = {
          date,
          formattedDate: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          timestamp: dateObj.getTime(),
        }

        // Add weight for each selected exercise (only if data exists)
        let hasData = false
        for (const exerciseName of selectedExercises) {
          const weight = exerciseMap.get(exerciseName)
          if (weight && weight > 0) {
            point[exerciseName] = weight
            hasData = true
          }
          // Don't add the key at all if there's no data - Recharts will handle undefined
        }

        // Only include points that have at least one exercise with data
        return hasData ? point : null
      })
      .filter((point): point is ExerciseDataPoint => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

    return dataPoints
  }, [sessions, daysView, selectedExercises])

  // Generate colors for each exercise
  const exerciseColors = [
    '#f97316', // Orange
    '#3b82f6', // Blue
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
    '#ec4899', // Pink
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        {/* Exercise Search */}
        <div className="relative">
          <Command className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg">
            <CommandInput
              placeholder="Search exercises..."
              value={searchValue}
              onValueChange={setSearchValue}
              onFocus={() => setSearchOpen(true)}
              className="text-white"
            />
            {searchOpen && filteredExercises.length > 0 && (
              <CommandList className="max-h-48">
                <CommandEmpty>No exercises found.</CommandEmpty>
                <CommandGroup>
                  {filteredExercises.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name}
                      onSelect={() => addExercise(exercise.name)}
                      className="text-white hover:bg-[#2a2a2a] cursor-pointer"
                    >
                      {exercise.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </div>
      </div>

      {/* Selected Exercises Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedExercises.map((exerciseName, index) => (
          <div
            key={exerciseName}
            className="flex items-center gap-2 bg-[#333333] px-3 py-1 rounded-md"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: exerciseColors[index % exerciseColors.length] }}
            />
            <span className="text-sm text-white">{exerciseName}</span>
            <button
              onClick={() => removeExercise(exerciseName)}
              className="text-gray-400 hover:text-white cursor-pointer ml-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Weight Progression</h3>
        {chartData.length === 0 || selectedExercises.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>No weight data available for the selected exercises and period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', style: { fill: '#888888' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#ffffff',
                }}
                formatter={(value: number | undefined) => {
                  if (value === null || value === undefined || value === 0) {
                    return null // Don't show tooltip for missing values
                  }
                  return [`${value.toFixed(1)} lbs`, '']
                }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend
                wrapperStyle={{ color: '#ffffff', paddingTop: '20px' }}
              />
              {selectedExercises.map((exerciseName, index) => (
                <Line
                  key={exerciseName}
                  type="monotone"
                  dataKey={exerciseName}
                  stroke={exerciseColors[index % exerciseColors.length]}
                  strokeWidth={2}
                  dot={(props: any) => {
                    // Only show dot if value exists and is greater than 0
                    const value = props.payload?.[exerciseName]
                    if (value && value > 0) {
                      return <circle cx={props.cx} cy={props.cy} r={4} fill={exerciseColors[index % exerciseColors.length]} />
                    }
                    return null
                  }}
                  activeDot={{ r: 6 }}
                  name={exerciseName}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

