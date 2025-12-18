'use client'

import { useEffect, useState } from 'react'
import { fetchPayments } from '@/supabase/fetches/fetchpayments'
import { fetchPersonPackages } from '@/supabase/fetches/fetchpersonpackages'
import { fetchPackages } from '@/supabase/fetches/fetchpackages'
import { fetchClients } from '@/supabase/fetches/fetchpeople'
import { upsertPayment } from '@/supabase/upserts/upsertpayment'
import { associatePaymentToPersonPackage } from '@/supabase/utils/associatePaymentToPersonPackage'
import { Payment } from '@/supabase/fetches/fetchpayments'
import { PersonPackage } from '@/supabase/fetches/fetchpersonpackages'
import { Package } from '@/supabase/fetches/fetchpackages'
import { Person } from '@/supabase/fetches/fetchpeople'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [personPackages, setPersonPackages] = useState<PersonPackage[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [clients, setClients] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paymentsData, personPackagesData, packagesData, clientsData] = await Promise.all([
          fetchPayments(),
          fetchPersonPackages(),
          fetchPackages(),
          fetchClients(),
        ])
        setPayments(paymentsData)
        setPersonPackages(personPackagesData)
        setPackages(packagesData)
        setClients(clientsData)
        console.log('Loaded clients:', clientsData.length, clientsData)
        console.log('Clients with package_id:', clientsData.filter(c => c.package_id).map(c => ({ id: c.id, name: c.name, package_id: c.package_id })))
        console.log('Loaded person_packages:', personPackagesData.length)
      } catch (err) {
        console.error('Error loading data:', err)
        alert('Error loading data. Please check the console for details.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAddPayment = async () => {
    if (!selectedPersonId || !amount || !paymentDate) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      // First, create the payment without person_package_id
      let paymentDateTimestamp = new Date(paymentDate).toISOString()
      
      const newPayment = await upsertPayment({
        person_package_id: null, // Will be set by association logic
        amount: parseFloat(amount),
        payment_date: paymentDateTimestamp,
        method: method || null,
        notes: notes || null,
      })

      // Associate payment to person_package based on payment date
      const associatedPersonPackageId = await associatePaymentToPersonPackage(
        selectedPersonId,
        paymentDateTimestamp,
        parseFloat(amount)
      )

      // Update payment with associated person_package_id if found
      if (associatedPersonPackageId) {
        const updatedPayment = await upsertPayment({
          id: newPayment.id,
          person_package_id: associatedPersonPackageId,
          amount: newPayment.amount,
          payment_date: newPayment.payment_date,
          method: newPayment.method,
          notes: newPayment.notes,
        })
        setPayments([updatedPayment, ...payments])
      } else {
        setPayments([newPayment, ...payments])
      }

      // Reload person packages to reflect status changes
      const updatedPersonPackages = await fetchPersonPackages()
      setPersonPackages(updatedPersonPackages)

      setShowAddForm(false)
      setSelectedPersonId('')
      setAmount('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setMethod('')
      setNotes('')
    } catch (err) {
      console.error('Error creating payment:', err)
      alert('Error creating payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Create maps for lookups
  const packageMap = new Map(packages.map(p => [p.id, p]))
  const clientMap = new Map(clients.map(c => [c.id, c]))

  // Filter clients to only show those who have a package_id (have been converted with packages)
  const clientsWithPackages = clients.filter(client => {
    // Check if package_id exists and is not null/undefined/empty
    const hasPackage = client.package_id != null && client.package_id !== ''
    return hasPackage
  })
  
  console.log('All clients:', clients.map(c => ({ name: c.name, package_id: c.package_id, converted_at: c.converted_at })))
  console.log('Clients with packages:', clientsWithPackages.length, clientsWithPackages.map(c => ({ name: c.name, package_id: c.package_id })))

  // Get person_packages with related data
  const personPackagesWithData = personPackages.map(pp => {
    const pkg = packageMap.get(pp.package_id)
    const client = clientMap.get(pp.person_id)
    return {
      ...pp,
      package: pkg,
      client: client,
    }
  })

  if (loading) {
    return (
      <div className="p-8 text-white bg-[#111111] min-h-screen">
        <p className="text-gray-300">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 text-white bg-[#111111] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payments Test UI</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Add Payment Form */}
      {showAddForm && (
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Payment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">
                Client *
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#111111] border border-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select a client</option>
                {clientsWithPackages.length === 0 ? (
                  <option value="" disabled>No clients with packages found</option>
                ) : (
                  clientsWithPackages.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The payment will be automatically associated with the appropriate billing period based on the payment date.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  Amount ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="bg-[#111111] text-white border-[#2a2a2a]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">
                Payment Method
              </label>
              <Input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g., Credit Card, Cash, Bank Transfer"
                className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">
                Notes
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this payment"
                className="bg-[#111111] text-white border-[#2a2a2a] placeholder-gray-400"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAddPayment}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer disabled:bg-green-400"
              >
                {saving ? 'Saving...' : 'Save Payment'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedPersonId('')
                  setAmount('')
                  setPaymentDate(new Date().toISOString().split('T')[0])
                  setMethod('')
                  setNotes('')
                }}
                variant="outline"
                className="bg-[#333333] hover:bg-[#404040] text-white border-[#2a2a2a] cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">All Payments ({payments.length})</h2>
        {payments.length === 0 ? (
          <p className="text-gray-400">No payments found.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const personPackage = personPackages.find(pp => pp.id === payment.person_package_id)
              const pkg = personPackage ? packageMap.get(personPackage.package_id) : null
              const client = personPackage ? clientMap.get(personPackage.person_id) : null

              return (
                <div
                  key={payment.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Payment
                        </h3>
                        {!payment.person_package_id && (
                          <span className="px-2 py-1 text-xs rounded border bg-yellow-600/20 text-yellow-400 border-yellow-600/50">
                            Not Associated
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p>
                          <span className="font-semibold text-white">Amount:</span> ${payment.amount.toFixed(2)}
                        </p>
                        <p>
                          <span className="font-semibold text-white">Date:</span> {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                        {payment.method && (
                          <p>
                            <span className="font-semibold text-white">Method:</span> {payment.method}
                          </p>
                        )}
                        {payment.notes && (
                          <p>
                            <span className="font-semibold text-white">Notes:</span> {payment.notes}
                          </p>
                        )}
                        {!payment.person_package_id && (
                          <p className="text-yellow-400 text-sm">
                            ⚠️ Payment not associated with a billing period
                          </p>
                        )}
                        {client && (
                          <p>
                            <span className="font-semibold text-white">Client:</span> {client.name}
                          </p>
                        )}
                        {pkg && (
                          <p>
                            <span className="font-semibold text-white">Package:</span> {pkg.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

