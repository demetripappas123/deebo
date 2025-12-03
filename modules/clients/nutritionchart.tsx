'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { NutritionEntry } from '@/supabase/fetches/fetchnutrition'
import { NutritionGoal } from '@/supabase/fetches/fetchnutritiongoals'

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type NutritionChartProps = {
  entries: NutritionEntry[]
  goals?: NutritionGoal[]
}

// Helper function to parse date string (YYYY-MM-DD) as local date to avoid timezone issues
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in Date constructor
}

export default function NutritionChart({ entries, goals = [] }: NutritionChartProps) {
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

  // Generate all days in the selected month
  const allDaysInMonth = useMemo(() => {
    const days: Date[] = []
    const year = selectedYear
    const month = selectedMonthNum - 1 // JavaScript months are 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate() // Last day of month
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }, [selectedYear, selectedMonthNum])

  // Create a map of entries by date string (YYYY-MM-DD) for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, NutritionEntry>()
    monthlyEntries.forEach(entry => {
      map.set(entry.entry_date, entry)
    })
    return map
  }, [monthlyEntries])

  // Find goal for selected month (goal_month format: 'YYYY-MM-01')
  const currentGoal = useMemo(() => {
    return goals.find(g => g.goal_month === selectedMonth) || null
  }, [goals, selectedMonth])

  // Helper function to determine color based on value vs goal
  const getColorForValue = (value: number | null, goal: number | null): string => {
    if (value === null || goal === null || goal === 0) {
      return '#9ca3af' // gray for no data or no goal
    }
    
    const percentage = (value / goal) * 100
    
    if (percentage >= 100) {
      return '#22c55e' // green - at or above goal
    } else if (percentage >= 80) {
      return '#eab308' // yellow - close to goal (80-100%)
    } else {
      return '#ef4444' // red - far from goal (below 80%)
    }
  }

  // Prepare chart data - one entry for every day of the month
  const { dates, fullDates, caloriesData, proteinData, carbsData, fatsData, caloriesColors, proteinColors, carbsColors, fatsColors } = useMemo(() => {
    const dateLabels: string[] = []
    const fullDateStrings: string[] = []
    const calData: (number | null)[] = []
    const protData: (number | null)[] = []
    const carbData: (number | null)[] = []
    const fatData: (number | null)[] = []
    const calColors: string[] = []
    const protColors: string[] = []
    const carbColors: string[] = []
    const fatColors: string[] = []

    allDaysInMonth.forEach(day => {
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      const entry = entriesByDate.get(dateStr)
      
      // Show day number for every 5th day, empty for others (creates notch effect)
      const dayNum = day.getDate()
      dateLabels.push(dayNum % 5 === 0 ? dayNum.toString() : '')
      fullDateStrings.push(day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      
      const calories = entry?.calories ?? null
      const protein = entry?.protein_grams ?? null
      const carbs = entry?.carbs_grams ?? null
      const fats = entry?.fats_grams ?? null
      
      calData.push(calories)
      protData.push(protein)
      carbData.push(carbs)
      fatData.push(fats)
      
      // Generate colors based on proximity to goals
      calColors.push(getColorForValue(calories, currentGoal?.calorie_goal ?? null))
      protColors.push(getColorForValue(protein, currentGoal?.protein_goal ?? null))
      carbColors.push(getColorForValue(carbs, currentGoal?.carbs_goal ?? null))
      fatColors.push(getColorForValue(fats, currentGoal?.fats_goal ?? null))
    })

    return {
      dates: dateLabels,
      fullDates: fullDateStrings,
      caloriesData: calData,
      proteinData: protData,
      carbsData: carbData,
      fatsData: fatData,
      caloriesColors: calColors,
      proteinColors: protColors,
      carbsColors: carbColors,
      fatsColors: fatColors,
    }
  }, [allDaysInMonth, entriesByDate, currentGoal])

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
        distributed: true, // Enable per-bar coloring
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
        show: true,
        showDuplicates: false,
        formatter: (value: string) => {
          // Hide empty labels to prevent colored squares
          return value || ''
        },
      },
      axisBorder: {
        show: false, // Hide axis border to prevent duplicate line
      },
      axisTicks: {
        show: false, // Hide tick marks (squares)
      },
      markers: {
        show: false, // Disable category markers (colored squares)
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
      xaxis: {
        lines: {
          show: false, // Hide vertical grid lines
        },
      },
      yaxis: {
        lines: {
          show: true, // Keep horizontal grid lines
        },
      },
    },
    fill: {
      colors: caloriesColors.length > 0 ? caloriesColors : ['#f97316'], // Use goal-based colors or fallback
    },
    markers: {
      size: 0, // Hide category markers (colored squares) on x-axis
    },
    tooltip: {
      theme: 'dark' as const,
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        const date = fullDates[dataPointIndex] || ''
        const value = series[seriesIndex][dataPointIndex]
        if (value === null || value === undefined) return ''
        return `
          <div style="padding: 10px; background: #1f1f1f; border: 1px solid #2a2a2a; border-radius: 4px;">
            <div style="color: #9ca3af; font-size: 12px;">${date}</div>
            <div style="color: #f97316; font-size: 14px; font-weight: bold; margin-top: 4px;">${value} cal</div>
          </div>
        `
      },
    },
  }), [dates, fullDates, caloriesColors])

  const caloriesSeries = useMemo(() => [
    {
      name: 'Calories',
      data: caloriesData,
    },
  ], [caloriesData])

  // Macros chart options (grouped bar)
  // Note: Per-bar coloring for grouped bars is complex in ApexCharts
  // Using default series colors for now
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
        categories: dates,
        labels: {
          style: {
            colors: '#9ca3af',
            fontSize: '11px',
          },
          show: true,
          showDuplicates: false,
        },
        axisBorder: {
          color: '#2a2a2a',
        },
        axisTicks: {
          color: '#2a2a2a',
          show: true,
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
        type: 'solid',
        opacity: 1,
      },
      colors: ['#3b82f6', '#22c55e', '#eab308'], // fallback colors for legend
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
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        const date = fullDates[dataPointIndex] || ''
        const seriesNames = ['Protein', 'Carbs', 'Fats']
        const defaultColors = ['#3b82f6', '#22c55e', '#eab308']
        const colorArrays = [proteinColors, carbsColors, fatsColors]
        const values = series.map((s: number[], idx: number) => {
          const val = s[dataPointIndex]
          if (val === null || val === undefined) return null
          const barColor = colorArrays[idx]?.[dataPointIndex] || defaultColors[idx]
          return { name: seriesNames[idx], value: val, color: barColor }
        }).filter((v: any) => v !== null)
        
        if (values.length === 0) return ''
        
        const valueItems = values.map((v: any) => 
          `<div style="color: ${v.color}; font-size: 13px; margin-top: 4px;">${v.name}: <strong>${v.value}g</strong></div>`
        ).join('')
        
        return `
          <div style="padding: 10px; background: #1f1f1f; border: 1px solid #2a2a2a; border-radius: 4px;">
            <div style="color: #9ca3af; font-size: 12px;">${date}</div>
            ${valueItems}
          </div>
        `
      },
    }
  }), [dates, fullDates, proteinColors, carbsColors, fatsColors])

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
          <style dangerouslySetInnerHTML={{__html: `
            .apexcharts-legend {
              display: none !important;
            }
            .apexcharts-xaxis .apexcharts-xaxis-texts-g rect {
              display: none !important;
            }
          `}} />
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

