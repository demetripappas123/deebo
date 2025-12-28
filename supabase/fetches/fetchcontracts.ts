import { supabase } from '../supabaseClient'

export type ContractStatus = 'active' | 'cancelled' | 'frozen'

export interface Contract {
  id: string
  person_id: string
  package_id: string
  duration: number
  status: ContractStatus
  first_billing_date: string | null
  auto_renew: boolean
  documents: any | null // JSON column
  created_at?: string
}

/**
 * Fetch all contracts
 * Optionally filter by trainer_id
 */
export async function fetchContracts(trainerId?: string | null): Promise<Contract[]> {
  let query = supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })

  if (trainerId) {
    query = query.eq('trainer_id', trainerId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching contracts:', error)
    throw error
  }

  return data ?? []
}

/**
 * Fetch a single contract by ID
 */
export async function fetchContractById(contractId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching contract:', error)
    throw error
  }

  return data
}

/**
 * Fetch contracts for a specific person
 */
export async function fetchContractsByPersonId(personId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contracts by person ID:', error)
    throw error
  }

  return data ?? []
}

