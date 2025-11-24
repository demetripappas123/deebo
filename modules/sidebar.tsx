// modules/sidebar.tsx
'use client'

import Link from 'next/link'
import React from 'react'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#181818] text-white shadow-lg border-r border-[#2a2a2a]">
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-[#2a2a2a]">
          <Link href="/">
            <span className="text-2xl font-bold text-white">
              Evil CRM
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dash"
            className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/clients"
            className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="font-medium">Clients</span>
          </Link>
          <Link
            href="/prospects"
            className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="font-medium">Prospects</span>
          </Link>
          <Link
            href="/calendar"
            className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="font-medium">Calendar</span>
          </Link>
          <Link
            href="/programs"
            className="flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="font-medium">Programs</span>
          </Link>
         
        </nav>
      </div>
    </aside>
  )
}
