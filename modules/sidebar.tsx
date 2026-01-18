// modules/sidebar.tsx
'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import { Settings, ChevronDown, ChevronRight, LayoutDashboard, Users, UserPlus, Calendar, BookOpen, Folder, Dumbbell, List, UtensilsCrossed } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Sidebar() {
  const [libraryExpanded, setLibraryExpanded] = useState(true)

  return (
    <aside className="w-64 bg-background text-foreground shadow-lg border-r border-border">
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/dash">
            <span className="text-2xl font-bold text-foreground">
              TurboTrain
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <div className="flex-1 space-y-2">
            <Link
              href="/dash"
              className="flex items-center px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 mr-3" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/clients"
              className="flex items-center px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <Users className="h-5 w-5 mr-3" />
              <span className="font-medium">Clients</span>
            </Link>
            <Link
              href="/prospects"
              className="flex items-center px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <UserPlus className="h-5 w-5 mr-3" />
              <span className="font-medium">Prospects</span>
            </Link>
            <Link
              href="/calendar"
              className="flex items-center px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <Calendar className="h-5 w-5 mr-3" />
              <span className="font-medium">Calendar</span>
            </Link>
            
            {/* Library Section */}
            <div>
              <button
                onClick={() => setLibraryExpanded(!libraryExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-3" />
                  <span className="font-medium">Library</span>
                </div>
                {libraryExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {libraryExpanded && (
                <div className="ml-4 space-y-1">
                  <Link
                    href="/programs"
                    className="flex items-center px-4 py-2 font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Folder className="h-4 w-4 mr-3" />
                    <span>Programs</span>
                  </Link>
                  <Link
                    href="/workout-library"
                    className="flex items-center px-4 py-2 font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Dumbbell className="h-4 w-4 mr-3" />
                    <span>Workouts</span>
                  </Link>
                  <Link
                    href="/exercises"
                    className="flex items-center px-4 py-2 font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <List className="h-4 w-4 mr-3" />
                    <span>Exercises</span>
                  </Link>
                  <Link
                    href="/nutrition-library"
                    className="flex items-center px-4 py-2 font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <UtensilsCrossed className="h-4 w-4 mr-3" />
                    <span>Nutrition</span>
                  </Link>
                </div>
              )}
            </div>
            
            <Link
              href="/settings"
              className="flex items-center px-4 py-3 text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5 mr-3" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  )
}
