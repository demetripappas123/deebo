// context/ThemeContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeContextType = {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)

  // Load saved mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved) setDarkMode(saved === 'true')
  }, [])

  // Apply class to <html> whenever darkMode changes
  useEffect(() => {
    const html = document.documentElement
    if (darkMode) html.classList.add('dark')
    else html.classList.remove('dark')

    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
