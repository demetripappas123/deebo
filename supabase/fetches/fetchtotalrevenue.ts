import { supabase } from '../supabaseClient'

/**
 * Calculate MTD (Month To Date) revenue
 * Sum of all payments from the current month
 */
export async function fetchTotalRevenue(): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  
  // Format dates for Supabase query (ISO string)
  const startDate = startOfMonth.toISOString()
  const endDate = endOfMonth.toISOString()
  
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  if (error) {
    console.error('Error fetching MTD revenue:', error)
    throw error
  }

  if (!data || data.length === 0) return 0

  // Sum all payment amounts
  const totalRevenue = data.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0
    if (isNaN(amount)) return sum
    return sum + amount
  }, 0)

  return totalRevenue || 0
}

