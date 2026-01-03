'use client'

import React from 'react'

type QuickMetricCardProps = {
  title: string
  value: number | null
  icon?: React.ReactNode
  loading?: boolean
}

export default function QuickMetricCard({ title, value, icon, loading }: QuickMetricCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        {icon && <div className="text-[var(--text-secondary)]">{icon}</div>}
      </div>
      {loading || value === null ? (
        <div className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse"></div>
      ) : (
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</p>
      )}
    </div>
  )
}

