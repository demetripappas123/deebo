import { supabase } from '../supabaseClient'

export interface Payment {
  id: string
  person_package_id: string | null
  amount: number
  payment_date: string
  method: string | null
  notes: string | null
}

/**
 * Fetch all payments
 */
export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch payments for a specific person_package
 */
export async function fetchPaymentsByPersonPackage(personPackageId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('person_package_id', personPackageId)
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments by person_package:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single payment by ID
 */
export async function fetchPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching payment:', error)
    throw error
  }

  return data
}

