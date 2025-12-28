'use client'

import React from 'react'
import { Contract } from '@/supabase/fetches/fetchcontracts'
import { Package } from '@/supabase/fetches/fetchpackages'

type ContractsProps = {
  contracts: Contract[]
  packages: Package[]
}

export default function Contracts({ contracts, packages }: ContractsProps) {
  const packageMap = new Map(packages.map(pkg => [pkg.id, pkg]))

  // Sort contracts: active first, then by created_at descending
  const sortedContracts = [...contracts].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  })

  if (contracts.length === 0) {
    return (
      <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
        <h2 className="text-lg font-semibold text-white mb-4">Contracts</h2>
        <p className="text-gray-400 text-sm">No contracts found for this client.</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500'
      case 'cancelled':
        return 'text-red-500'
      case 'frozen':
        return 'text-yellow-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
      <h2 className="text-lg font-semibold text-white mb-4">Contracts</h2>
      <div className="space-y-4">
        {sortedContracts.map((contract) => {
          const pkg = packageMap.get(contract.package_id)
          
          return (
            <div
              key={contract.id}
              className={`bg-[#111111] border rounded-lg p-4 ${
                contract.status === 'active' ? 'border-green-500/50' : 'border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {pkg?.name || 'Unknown Package'}
                </h3>
                <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusColor(contract.status)}`}>
                  {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                <div>
                  <span className="font-semibold text-white">Duration:</span>{' '}
                  {contract.duration} {contract.duration === 1 ? 'month' : 'months'}
                </div>
                {contract.first_billing_date && (
                  <div>
                    <span className="font-semibold text-white">First Billing Date:</span>{' '}
                    {new Date(contract.first_billing_date).toLocaleDateString()}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-white">Auto Renew:</span>{' '}
                  {contract.auto_renew ? (
                    <span className="text-green-500">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </div>
                {contract.created_at && (
                  <div>
                    <span className="font-semibold text-white">Created:</span>{' '}
                    {new Date(contract.created_at).toLocaleDateString()}
                  </div>
                )}
                {pkg && (
                  <>
                    <div>
                      <span className="font-semibold text-white">Unit Cost:</span>{' '}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pkg.unit_cost)}
                    </div>
                    <div>
                      <span className="font-semibold text-white">Units per Cycle:</span>{' '}
                      {pkg.units_per_cycle}
                    </div>
                    <div>
                      <span className="font-semibold text-white">Billing Cycle:</span>{' '}
                      {pkg.billing_cycle_weeks} {pkg.billing_cycle_weeks === 1 ? 'week' : 'weeks'}
                    </div>
                    {pkg.session_duration_minutes && (
                      <div>
                        <span className="font-semibold text-white">Session Duration:</span>{' '}
                        {pkg.session_duration_minutes} minutes
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}





