// app/layout.tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Sidebar from "@/modules/sidebar"
import { ThemeProvider } from "@/context/themecontext"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "My Dashboard App",
  description: "Dashboard and client management app",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#111111] text-white`}
      >
        <ThemeProvider>
        <div className="flex min-h-screen bg-[#111111]">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <main className="flex-1 p-8 overflow-auto bg-[#111111]">
            {children}
          </main>
        </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
