// app/layout.tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/context/themecontext"
import { AuthProvider } from "@/context/authcontext"
import AuthProtected from "@/components/auth-protected"

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
          <AuthProvider>
            <AuthProtected>
              {children}
            </AuthProtected>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
