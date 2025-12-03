'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { NutritionEntry } from '@/supabase/fetches/fetchnutrition'

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type NutritionChartProps = {
  entries: NutritionEntry[]
}

// Helper function to parse date string (YYYY-MM-DD) as local date to avoid timezone issues
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in Date constructor
}

export default function NutritionChart({ entries }: NutritionChartProps) {
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })

  // Parse selected month
  const selectedDate = new Date(selectedMonth + 'T00:00:00')
  const selectedMonthNum = selectedDate.getMonth() + 1
  const selectedYear = selectedDate.getFullYear()

  // Filter entries for selected month and sort
  const monthlyEntries = useMemo(() => {
    return entries
      .filter(entry => {
        const d = parseLocalDate(entry.entry_date)
        return d.getMonth() + 1 === selectedMonthNum && d.getFullYear() === selectedYear
      })
      .sort((a, b) => parseLocalDate(a.entry_date).getTime() - parseLocalDate(b.entry_date).getTime())
  }, [entries, selectedMonthNum, selectedYear])

  const formatMonthDisplay = (monthStr: string) => {
    const date = new Date(monthStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const date = new Date(selectedMonth + 'T00:00:00')
    const currentYear = date.getFullYear()
    const currentMonth = date.getMonth()
    
    let newYear = currentYear
    let newMonth = currentMonth
    
    if (direction === 'prev') {
      if (currentMonth === 0) {
        newMonth = 11
        newYear = currentYear - 1
      } else {
        newMonth = currentMonth - 1
      }
    } else {
      if (currentMonth === 11) {
        newMonth = 0
        newYear = currentYear + 1
      } else {
        newMonth = currentMonth + 1
      }
    }
    
    setSelectedMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`)
  }

  // Prepare chart data
  const dates = monthlyEntries.length > 0
    ? monthlyEntries.map(entry =>
        parseLocalDate(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      )
    : []
  const caloriesData = monthlyEntries.length > 0
    ? monthlyEntries.map(entry => entry.calories || 0)
    : []
  const proteinData = monthlyEntries.length > 0
    ? monthlyEntries.map(entry => entry.protein_grams || 0)
    : []
  const carbsData = monthlyEntries.length > 0
    ? monthlyEntries.map(entry => entry.carbs_grams || 0)
    : []
  const fatsData = monthlyEntries.length > 0
    ? monthlyEntries.map(entry => entry.fats_grams || 0)
    : []

  // Memoize chart options to prevent recreation
  const caloriesOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      background: '#111111',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: dates.length > 0 ? dates : ['No data'],
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
      axisBorder: {
        color: '#2a2a2a',
      },
      axisTicks: {
        color: '#2a2a2a',
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
    },
    grid: {
      borderColor: '#2a2a2a',
      strokeDashArray: 4,
    },
    fill: {
      colors: ['#f97316'], // orange-500
    },
    tooltip: {
      theme: 'dark' as const,
      y: {
        formatter: (val: number) => `${val} cal`,
      },
    },
  }), [dates])

  const caloriesSeries = useMemo(() => [
    {
      name: 'Calories',
      data: caloriesData,
    },
  ], [caloriesData])

  // Macros chart options (grouped bar)
  const macrosOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      background: '#111111',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: dates.length > 0 ? dates : ['No data'],
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
      axisBorder: {
        color: '#2a2a2a',
      },
      axisTicks: {
        color: '#2a2a2a',
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
    },
    grid: {
      borderColor: '#2a2a2a',
      strokeDashArray: 4,
    },
    colors: ['#3b82f6', '#22c55e', '#eab308'], // blue-500, green-500, yellow-500
    legend: {
      show: true,
      position: 'top' as const,
      labels: {
        colors: '#9ca3af',
      },
      markers: {
        size: 8,
      },
    },
    tooltip: {
      theme: 'dark' as const,
      y: {
        formatter: (val: number) => `${val}g`,
      },
    },
  }), [dates])

  const macrosSeries = useMemo(() => [
    {
      name: 'Protein',
      data: proteinData,
    },
    {
      name: 'Carbs',
      data: carbsData,
    },
    {
      name: 'Fats',
      data: fatsData,
    },
  ], [proteinData, carbsData, fatsData])

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="px-3 py-1 bg-[#333333] hover:bg-[#404040] rounded-md cursor-pointer text-white"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold text-white">
          {formatMonthDisplay(selectedMonth)}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="px-3 py-1 bg-[#333333] hover:bg-[#404040] rounded-md cursor-pointer text-white"
        >
          →
        </button>
      </div>

      {/* Calories Chart */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Calories</h3>
        <div className="bg-[#111111] rounded-md p-4">
          {monthlyEntries.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-400">No nutrition entries for {formatMonthDisplay(selectedMonth)} yet.</p>
            </div>
          ) : (
            <Chart
              options={caloriesOptions}
              series={caloriesSeries}
              type="bar"
              height={300}
            />
          )}
        </div>
      </div>

      {/* Macros Chart */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Macros (g)</h3>
        <div className="bg-[#111111] rounded-md p-4">
          {monthlyEntries.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-400">No nutrition entries for {formatMonthDisplay(selectedMonth)} yet.</p>
            </div>
          ) : (
            <Chart
              options={macrosOptions}
              series={macrosSeries}
              type="bar"
              height={300}
            />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {monthlyEntries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
            <div className="text-xs text-gray-400 mb-1">Avg Calories</div>
            <div className="text-lg font-semibold text-white">
              {Math.round(
                monthlyEntries.reduce((sum, e) => sum + (e.calories || 0), 0) / monthlyEntries.length
              ) || 0}
            </div>
          </div>
          <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
            <div className="text-xs text-gray-400 mb-1">Avg Protein</div>
            <div className="text-lg font-semibold text-white">
              {Math.round(
                monthlyEntries.reduce((sum, e) => sum + (e.protein_grams || 0), 0) / monthlyEntries.length
              ) || 0}g
            </div>
          </div>
          <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
            <div className="text-xs text-gray-400 mb-1">Avg Carbs</div>
            <div className="text-lg font-semibold text-white">
              {Math.round(
                monthlyEntries.reduce((sum, e) => sum + (e.carbs_grams || 0), 0) / monthlyEntries.length
              ) || 0}g
            </div>
          </div>
          <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
            <div className="text-xs text-gray-400 mb-1">Avg Fats</div>
            <div className="text-lg font-semibold text-white">
              {Math.round(
                monthlyEntries.reduce((sum, e) => sum + (e.fats_grams || 0), 0) / monthlyEntries.length
              ) || 0}g
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

