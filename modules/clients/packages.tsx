'use client'

import React from 'react'
import { PersonPackage } from '@/supabase/fetches/fetchpersonpackages'
import { Package } from '@/supabase/fetches/fetchpackages'

type PackagesProps = {
  personPackages: PersonPackage[]
  packages: Package[]
}

export default function Packages({ personPackages, packages }: PackagesProps) {
  if (personPackages.length === 0) {
    return (
      <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
        <h2 className="text-lg font-semibold text-white mb-4">Packages</h2>
        <p className="text-gray-400 text-sm">No packages assigned to this client.</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-md">
      <h2 className="text-lg font-semibold text-white mb-4">Packages</h2>
      <div className="space-y-4">
        {personPackages.map((personPackage) => {
          const packageData = packages.find(pkg => pkg.id === personPackage.package_id)
          const remainingUnits = personPackage.total_units - personPackage.used_units
          
          return (
            <div key={personPackage.id} className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {packageData?.name || 'Unknown Package'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Status: <span className={`font-medium ${
                      personPackage.status === 'active' ? 'text-green-500' :
                      personPackage.status === 'pending' ? 'text-yellow-500' :
                      'text-gray-400'
                    }`}>
                      {personPackage.status}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Start Date</p>
                  <p className="text-white font-medium">
                    {new Date(personPackage.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">End Date</p>
                  <p className="text-white font-medium">
                    {new Date(personPackage.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Units Used</p>
                  <p className="text-white font-medium">
                    {personPackage.used_units} / {personPackage.total_units}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Remaining</p>
                  <p className={`font-medium ${
                    remainingUnits > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {remainingUnits}
                  </p>
                </div>
              </div>

              {packageData && (
                <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Unit Cost</p>
                      <p className="text-white font-medium">
                        ${Number(packageData.unit_cost).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Units per Cycle</p>
                      <p className="text-white font-medium">
                        {packageData.units_per_cycle}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Billing Cycle</p>
                      <p className="text-white font-medium">
                        {packageData.billing_cycle_weeks} weeks
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Duration</p>
                      <p className="text-white font-medium">
                        {packageData.session_duration_minutes ? `${packageData.session_duration_minutes} min` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

