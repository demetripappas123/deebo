'use client'

import React, { useMemo, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import ChartSkeleton from './chartskeleton'
import { DateRange, getDateRangeBounds } from '@/supabase/utils/daterange'
import { useTheme } from '@/context/themecontext'

type LeadSource = {
  source: string
  count: number
}

type LeadSourcesChartProps = {
  sources: LeadSource[]
  prospects?: Array<{ created_at: string; lead_source: string | null }>
  loading?: boolean
  dateRange?: 'today' | 'yesterday' | 'weekly' | 'monthly'
}

export default function LeadSourcesChart({ sources, prospects = [], loading, dateRange = 'monthly' }: LeadSourcesChartProps) {
  const { theme } = useTheme()
  const [chartColors, setChartColors] = useState({
    textPrimary: '#d1d5db',
    textSecondary: '#4b5563',
    border: '#2a2a2a',
    bg: '#1f1f1f',
  })

  useEffect(() => {
    // Get computed CSS variable values for chart colors
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    setChartColors({
      textPrimary: computedStyle.getPropertyValue('--text-secondary').trim() || '#d1d5db',
      textSecondary: computedStyle.getPropertyValue('--border-tertiary').trim() || '#4b5563',
      border: computedStyle.getPropertyValue('--border-primary').trim() || '#2a2a2a',
      bg: computedStyle.getPropertyValue('--bg-secondary').trim() || '#1f1f1f',
    })
  }, [theme])

  const chartOption = useMemo(() => {
    if (!prospects || prospects.length === 0) return null

    // Filter prospects by date range
    const rangeBounds = getDateRangeBounds(dateRange)
    const filteredProspects = prospects.filter((prospect) => {
      const prospectDate = new Date(prospect.created_at)
      return prospectDate >= rangeBounds.start && prospectDate <= rangeBounds.end
    })

    if (filteredProspects.length === 0) return null

    // Count leads per source
    const sourceCounts = new Map<string, number>()
    filteredProspects.forEach((prospect) => {
      const source = prospect.lead_source || 'Unknown'
      if (source && source !== '') {
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
      }
    })

    // Get top 4 sources by count
    const sortedSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 4) // Take top 4
      .map(([source]) => source) // Extract just the source names
      .sort() // Sort alphabetically for display

    // Group prospects by date and lead source (only for top 4 sources)
    const dateSourceMap = new Map<string, Map<string, number>>()
    
    filteredProspects.forEach((prospect) => {
      const date = new Date(prospect.created_at).toISOString().split('T')[0]
      const source = prospect.lead_source || 'Unknown'
      
      // Only include if it's one of the top 4 sources
      if (!sortedSources.includes(source)) return
      
      if (!dateSourceMap.has(date)) {
        dateSourceMap.set(date, new Map())
      }
      
      const sourceMap = dateSourceMap.get(date)!
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    })

    // Prepare scatter data - one dot per date per source
    // Include count as third element in value array for symbolSize function
    const scatterData: Array<{ value: [number, number, number]; count: number; date: string; source: string }> = []
    
    dateSourceMap.forEach((sourceMap, date) => {
      sourceMap.forEach((count, source) => {
        const sourceIndex = sortedSources.indexOf(source)
        if (sourceIndex !== -1) {
          const dateTime = new Date(date).getTime()
          scatterData.push({
            value: [dateTime, sourceIndex, count], // Include count as third element
            count: count,
            date: date,
            source: source,
          })
        }
      })
    })

    // Calculate date range for X-axis
    const dates = Array.from(dateSourceMap.keys()).map(d => new Date(d).getTime())
    const minDate = dates.length > 0 ? Math.min(...dates) : Date.now()
    const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now()
    const dateRangeMs = maxDate - minDate || 1
    const padding = dateRangeMs * 0.1

    // Calculate average daily lead amount for normalization
    const totalLeads = scatterData.reduce((sum, d) => sum + d.count, 0)
    const numDays = dateSourceMap.size || 1
    const avgDailyLeads = totalLeads / numDays

    // Calculate max count for reference
    const maxCount = scatterData.length > 0 ? Math.max(...scatterData.map(d => d.count), 1) : 1

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '120px',
        right: '20px',
        top: '20px',
        bottom: '50px',
        containLabel: false,
      },
      xAxis: {
        type: 'time',
        axisLine: {
          show: true,
          lineStyle: {
            color: chartColors.textSecondary,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartColors.textPrimary,
          fontSize: 10,
          formatter: (value: number) => {
            const date = new Date(value)
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: chartColors.border,
            type: 'dashed',
          },
        },
        min: minDate - padding,
        max: maxDate + padding,
      },
      yAxis: {
        type: 'category',
        data: sortedSources,
        axisLine: {
          show: true,
          lineStyle: {
            color: chartColors.textSecondary,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartColors.textPrimary,
          fontSize: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: chartColors.border,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'scatter',
          data: scatterData.map(d => ({
            value: d.value,
            count: d.count,
            date: d.date,
            source: d.source,
          })),
          symbolSize: (value: any, params: any) => {
            // 1.5x increase for every 2x increase in lead amount
            // Normalized based on average daily lead amount
            // Count is the third element in the value array [x, y, count]
            let count = 1
            if (Array.isArray(value) && value.length >= 3) {
              count = value[2] // Third element is the count
            } else if (params?.data?.count) {
              count = params.data.count
            }
            
            // Base size adjusted by average daily leads (prevents giant bubbles)
            // If avg is high, reduce base size; if avg is low, increase it
            const normalizedBaseSize = Math.max(8, Math.min(20, 15 / Math.max(1, avgDailyLeads / 5)))
            
            // 1.5x increase for every 2x increase: size = base * (1.5 ^ log2(count))
            // For count = 1: size = base * 1.5^0 = base
            // For count = 2: size = base * 1.5^1 = base * 1.5
            // For count = 4: size = base * 1.5^2 = base * 2.25
            const log2Count = Math.log2(Math.max(1, count))
            const size = normalizedBaseSize * Math.pow(1.5, log2Count)
            
            // Apply reasonable min/max bounds
            return Math.max(8, Math.min(60, size))
          },
          itemStyle: {
            color: '#f97316',
            opacity: 0.8,
          },
          emphasis: {
            itemStyle: {
              color: '#f97316',
              opacity: 1,
            },
          },
        },
      ],
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data
          const date = new Date(data.date)
          return `
            <div style="padding: 4px 0;">
              <strong>${data.source}</strong><br/>
              Date: ${date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              })}<br/>
              Leads: ${data.count}
            </div>
          `
        },
        backgroundColor: chartColors.bg,
        borderColor: chartColors.border,
        borderWidth: 1,
        textStyle: {
          color: chartColors.textPrimary,
          fontSize: 12,
        },
        padding: [8, 12],
      },
      animation: false,
    }
  }, [prospects, dateRange, chartColors])

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 min-h-[300px]">
        <ChartSkeleton type="bar" title="Lead Sources" />
      </div>
    )
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 min-h-[300px] flex flex-col">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Lead Sources</h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-2">No lead source data available</p>
            <p className="text-[var(--text-tertiary)] text-xs">Add prospects with lead sources to see data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 min-h-[300px] flex flex-col">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Lead Sources</h3>
      <div className="flex-1">
        {chartOption ? (
          <ReactECharts
            option={chartOption}
            style={{ width: '100%', height: '100%', minHeight: '250px' }}
            opts={{ renderer: 'svg' }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            No data available for the selected date range
          </div>
        )}
      </div>
    </div>
  )
}
