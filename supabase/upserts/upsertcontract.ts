import { supabase } from '../supabaseClient'
import { Contract, ContractStatus } from '../fetches/fetchcontracts'

export interface ContractFormData {
  id?: string
  person_id: string
  package_id: string
  duration: number
  status?: ContractStatus
  first_billing_date?: string | null
  auto_renew?: boolean
  documents?: any | null
}

/**
 * Create or update a contract
 */
export async function upsertContract(contractData: ContractFormData): Promise<Contract> {
  const data: any = {
    person_id: contractData.person_id,
    package_id: contractData.package_id,
    duration: contractData.duration,
    status: contractData.status ?? 'active',
    first_billing_date: contractData.first_billing_date ?? null,
    auto_renew: contractData.auto_renew ?? false,
    documents: contractData.documents ?? null,
  }

  if (contractData.id) {
    // Update existing contract
    const { data: updatedContract, error } = await supabase
      .from('contracts')
      .update(data)
      .eq('id', contractData.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contract:', error)
      throw error
    }

    return updatedContract
  } else {
    // Create new contract
    const { data: newContract, error } = await supabase
      .from('contracts')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Error creating contract:', error)
      throw error
    }

    return newContract
  }
}

