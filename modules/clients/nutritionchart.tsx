'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { NutritionEntry } from '@/supabase/fetches/fetchnutrition'

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type NutritionChartProps = {
  entries: NutritionEntry[]
}

export default function NutritionChart({ entries }: NutritionChartProps) {
  // Sort entries by date
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    )
  }, [entries])

  if (sortedEntries.length === 0) {
    return <p className="text-gray-400">No nutrition entries yet.</p>
  }

  // Prepare chart data
  const dates = sortedEntries.map(entry => 
    new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )
  const caloriesData = sortedEntries.map(entry => entry.calories || 0)
  const proteinData = sortedEntries.map(entry => entry.protein_grams || 0)
  const carbsData = sortedEntries.map(entry => entry.carbs_grams || 0)
  const fatsData = sortedEntries.map(entry => entry.fats_grams || 0)

  // Calories chart options
  const caloriesOptions = {
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
      categories: dates,
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
  }

  const caloriesSeries = [
    {
      name: 'Calories',
      data: caloriesData,
    },
  ]

  // Macros chart options (grouped bar)
  const macrosOptions = {
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      background: '#111111',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
        dataLabels: {
          position: 'top' as const,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: dates,
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
        width: 12,
        height: 12,
        radius: 2,
      },
    },
    tooltip: {
      theme: 'dark' as const,
      y: {
        formatter: (val: number) => `${val}g`,
      },
    },
  }

  const macrosSeries = [
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
  ]

  return (
    <div className="space-y-6">
      {/* Calories Chart */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Calories</h3>
        <div className="bg-[#111111] rounded-md p-4">
          <Chart
            options={caloriesOptions}
            series={caloriesSeries}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {/* Macros Chart */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Macros (g)</h3>
        <div className="bg-[#111111] rounded-md p-4">
          <Chart
            options={macrosOptions}
            series={macrosSeries}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Avg Calories</div>
          <div className="text-lg font-semibold text-white">
            {Math.round(
              sortedEntries.reduce((sum, e) => sum + (e.calories || 0), 0) / sortedEntries.length
            ) || 0}
          </div>
        </div>
        <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Avg Protein</div>
          <div className="text-lg font-semibold text-white">
            {Math.round(
              sortedEntries.reduce((sum, e) => sum + (e.protein_grams || 0), 0) / sortedEntries.length
            ) || 0}g
          </div>
        </div>
        <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Avg Carbs</div>
          <div className="text-lg font-semibold text-white">
            {Math.round(
              sortedEntries.reduce((sum, e) => sum + (e.carbs_grams || 0), 0) / sortedEntries.length
            ) || 0}g
          </div>
        </div>
        <div className="p-3 bg-[#111111] border border-[#2a2a2a] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Avg Fats</div>
          <div className="text-lg font-semibold text-white">
            {Math.round(
              sortedEntries.reduce((sum, e) => sum + (e.fats_grams || 0), 0) / sortedEntries.length
            ) || 0}g
          </div>
        </div>
      </div>
    </div>
  )
}

