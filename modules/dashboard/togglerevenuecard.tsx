'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactECharts from 'echarts-for-react'
import { fetchHistoricalRevenue, HistoricalRevenuePoint } from '@/supabase/fetches/fetchhistoricalrevenue'
import { DateRange } from '@/supabase/utils/daterange'
import { useTheme } from '@/context/themecontext'

type ToggleRevenueCardProps = {
  mtdRevenue: number | null
  projectedRevenue: number | null
  trainedRevenue: number | null
  dateRange: DateRange
  trainerId?: string | null
}

type RevenueType = 'mtd' | 'projected' | 'trained'

export default function ToggleRevenueCard({
  mtdRevenue,
  projectedRevenue,
  trainedRevenue,
  dateRange,
  trainerId,
}: ToggleRevenueCardProps) {
  const { theme } = useTheme()
  const [currentType, setCurrentType] = useState<RevenueType>('mtd')
  const [historicalData, setHistoricalData] = useState<HistoricalRevenuePoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [chartColors, setChartColors] = useState({
    textPrimary: '#d1d5db',
  })

  useEffect(() => {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    setChartColors({
      textPrimary: computedStyle.getPropertyValue('--text-secondary').trim() || '#d1d5db',
    })
  }, [theme])

  const revenueTypes: { type: RevenueType; label: string; value: number | null }[] = [
    { type: 'mtd', label: 'Revenue', value: mtdRevenue },
    { type: 'projected', label: 'EOM Projected Revenue', value: projectedRevenue },
    { type: 'trained', label: 'Trained Revenue', value: trainedRevenue },
  ]

  const currentIndex = revenueTypes.findIndex(r => r.type === currentType)
  const currentRevenue = revenueTypes[currentIndex]

  // Fetch historical data when type or date range changes
  useEffect(() => {
    const loadHistoricalData = async () => {
      setLoadingHistory(true)
      try {
        let revenueType: 'revenue' | 'trained' | 'projected' = 'revenue'
        if (currentType === 'trained') {
          revenueType = 'trained'
        } else if (currentType === 'projected') {
          revenueType = 'projected'
        }

        const data = await fetchHistoricalRevenue(trainerId, dateRange, revenueType)
        setHistoricalData(data)
      } catch (err) {
        console.error('Error loading historical revenue:', err)
        setHistoricalData([])
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistoricalData()
  }, [currentType, dateRange, trainerId])

  const navigateRevenue = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % revenueTypes.length
      : (currentIndex - 1 + revenueTypes.length) % revenueTypes.length
    setCurrentType(revenueTypes[newIndex].type)
  }

  // Prepare chart option
  const chartOption = useMemo(() => {
    if (historicalData.length === 0) return null

    const labels = historicalData.map(d => d.label)
    const values = historicalData.map(d => d.revenue)

    return {
      grid: {
        left: '35px',
        right: '10px',
        top: '60px',
        bottom: '40px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartColors.textPrimary,
          fontSize: 10,
          fontWeight: 500,
          rotate: 0,
          margin: 8,
          formatter: (value: string) => {
            // Extract month abbreviation (3 letters) from label
            // Labels might be in format like "Dec 2024" or "Dec"
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            // Try to find month in the label
            for (const month of monthNames) {
              if (value.includes(month)) {
                return month
              }
            }
            // If no match, try to parse as date
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', { month: 'short' })
            }
            // Fallback: return first 3 characters
            return value.substring(0, 3)
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartColors.textPrimary,
          fontSize: 9,
          fontWeight: 500,
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          name: 'Revenue',
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: '#f97316',
            width: 3,
          },
          itemStyle: {
            color: '#f97316',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(249, 115, 22, 0.6)', // Orange with opacity
                },
                {
                  offset: 0.5,
                  color: 'rgba(249, 115, 22, 0.3)',
                },
                {
                  offset: 1,
                  color: 'rgba(249, 115, 22, 0)', // Transparent
                },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#f97316',
            },
          },
        },
      ],
      tooltip: {
        show: false,
      },
      animation: false,
    }
  }, [historicalData, chartColors])

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 min-h-[300px] flex flex-col relative overflow-hidden">
      {/* Background Line Chart */}
      {historicalData.length > 0 && !loadingHistory && chartOption && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6, zIndex: 0 }}>
          <ReactECharts
            option={chartOption}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header with distinct area */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{currentRevenue.label}</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigateRevenue('prev')}
              variant="outline"
              size="sm"
              className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] h-8 w-8 p-0 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigateRevenue('next')}
              variant="outline"
              size="sm"
              className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] h-8 w-8 p-0 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          {currentRevenue.value === null ? (
            <div className="h-12 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse"></div>
          ) : (
            <p className="text-4xl font-bold text-[var(--text-primary)]">
              ${currentRevenue.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
