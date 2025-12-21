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

/**
 * Fetch payments for a specific person (through person_packages)
 */
export async function fetchPaymentsByPersonId(personId: string): Promise<Payment[]> {
  // First, get all person_packages for this person
  const { data: personPackages, error: ppError } = await supabase
    .from('person_packages')
    .select('id')
    .eq('person_id', personId)

  if (ppError) {
    console.error('Error fetching person_packages for payments:', ppError)
    throw ppError
  }

  if (!personPackages || personPackages.length === 0) {
    return []
  }

  const personPackageIds = personPackages.map(pp => pp.id)

  // Then fetch payments for those person_packages
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('person_package_id', personPackageIds)
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments by person:', error)
    throw error
  }

  return data ?? []
}

