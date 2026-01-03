'use client'

import React, { useEffect, useState } from 'react'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from '@/context/themecontext'

type ShowRateChartProps = {
  showRate: number // Percentage 0-100
}

export default function ShowRateChart({ showRate }: ShowRateChartProps) {
  const { theme } = useTheme()
  const [bgColor, setBgColor] = useState('#2a2a2a')

  useEffect(() => {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    // Use card or muted color for background circle
    const color = computedStyle.getPropertyValue('--color-muted').trim() || 
                  computedStyle.getPropertyValue('--muted').trim() ||
                  computedStyle.getPropertyValue('--color-card').trim() ||
                  computedStyle.getPropertyValue('--card').trim()
    setBgColor(color || '#2a2a2a')
  }, [theme])
  // Determine color based on percentage (red to green)
  const getColor = (percentage: number): string => {
    if (percentage >= 90) return '#22c55e' // green-500
    if (percentage >= 75) return '#84cc16' // lime-500
    if (percentage >= 60) return '#eab308' // yellow-500
    if (percentage >= 45) return '#f97316' // orange-500
    return '#ef4444' // red-500
  }

  const color = getColor(showRate)
  
  // Calculate end angle based on percentage
  // Start at 90 (top), go clockwise
  // 0% = 90 (no fill), 50% = -90 (semicircle), 100% = -270 (full circle)
  const startAngle = 90
  // Ensure endAngle is always less than startAngle, even for 0%
  const endAngle = showRate === 0 ? 90.1 : 90 - (360 * showRate / 100)
  
  const data = [
    {
      name: 'Show Rate',
      value: 100, // Always 100 for the bar, but endAngle controls the fill
      fill: color,
    },
  ]

  // Background circle (100%)
  const backgroundData = [
    {
      name: 'Background',
      value: 100,
      fill: bgColor, // Theme-aware background
    },
  ]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full max-w-[100px] h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="60%"
            outerRadius="90%"
            data={backgroundData}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="100%" className="absolute top-0 left-0">
          <RadialBarChart
            innerRadius="60%"
            outerRadius="90%"
            data={data}
            startAngle={startAngle}
            endAngle={endAngle}
          >
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {showRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      <h3 className="text-xs font-semibold text-[var(--text-primary)] mt-1">Show Rate</h3>
      <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">Sessions Completed</div>
    </div>
  )
}

