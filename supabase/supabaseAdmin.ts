// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase Admin environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗ MISSING')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗ MISSING')
  
  if (typeof window === 'undefined') {
    // Server-side: throw error during build if variables are missing
    throw new Error(
      'Supabase Admin environment variables are required. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
    )
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
