'use client'

import React, { useState } from 'react'
import { Payment } from '@/supabase/fetches/fetchpayments'
import { PersonPackage } from '@/supabase/fetches/fetchpersonpackages'
import { Package } from '@/supabase/fetches/fetchpackages'
import { upsertPayment } from '@/supabase/upserts/upsertpayment'
import { associatePaymentToPersonPackage } from '@/supabase/utils/associatePaymentToPersonPackage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil, Trash } from 'lucide-react'
import { deletePayment } from '@/supabase/deletions/deletepayment'

type PaymentsProps = {
  payments: Payment[]
  personPackages: PersonPackage[]
  packages: Package[]
  personId: string
  onPaymentAdded?: () => void
}

export default function Payments({ payments, personPackages, packages, personId, onPaymentAdded }: PaymentsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setAmount('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setMethod('')
    setNotes('')
    setEditingPaymentId(null)
    setShowAddForm(false)
  }

  const handleEdit = (payment: Payment) => {
    setEditingPaymentId(payment.id)
    setAmount(payment.amount.toString())
    setPaymentDate(new Date(payment.payment_date).toISOString().split('T')[0])
    setMethod(payment.method || '')
    setNotes(payment.notes || '')
    setShowAddForm(true)
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) {
      return
    }

    try {
      await deletePayment(paymentId)
      if (onPaymentAdded) {
        onPaymentAdded()
      }
    } catch (err) {
      console.error('Error deleting payment:', err)
      alert('Error deleting payment. Please try again.')
    }
  }

  const handleSave = async () => {
    if (!amount || !paymentDate) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const paymentDateTimestamp = new Date(paymentDate).toISOString()
      
      if (editingPaymentId) {
        // Update existing payment
        await upsertPayment({
          id: editingPaymentId,
          person_package_id: payments.find(p => p.id === editingPaymentId)?.person_package_id || null,
          amount: parseFloat(amount),
          payment_date: paymentDateTimestamp,
          method: method || null,
          notes: notes || null,
        })
      } else {
        // Create new payment
        const newPayment = await upsertPayment({
          person_package_id: null,
          amount: parseFloat(amount),
          payment_date: paymentDateTimestamp,
          method: method || null,
          notes: notes || null,
        })

        // Associate payment to person_package (always returns a person_package_id)
        const associatedPersonPackageId = await associatePaymentToPersonPackage(
          personId,
          paymentDateTimestamp,
          parseFloat(amount)
        )

        // Update payment with associated person_package_id
        await upsertPayment({
          id: newPayment.id,
          person_package_id: associatedPersonPackageId,
          amount: newPayment.amount,
          payment_date: newPayment.payment_date,
          method: newPayment.method,
          notes: newPayment.notes,
        })
      }

      resetForm()
      if (onPaymentAdded) {
        onPaymentAdded()
      }
    } catch (err) {
      console.error('Error saving payment:', err)
      alert('Error saving payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 bg-card border border-border rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Payments</h2>
        <Button
          onClick={() => {
            resetForm()
            setShowAddForm(true)
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Add/Edit Payment Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-foreground">
              {editingPaymentId ? 'Edit Payment' : 'Add New Payment'}
            </h3>
            <button
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                  Amount ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-input text-foreground border-border placeholder-muted-foreground [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="bg-input text-foreground border-border cursor-pointer"
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
                className="bg-input text-foreground border-border placeholder-muted-foreground"
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
                className="bg-input text-foreground border-border placeholder-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer disabled:bg-green-400"
                size="sm"
              >
                {saving ? 'Saving...' : editingPaymentId ? 'Update Payment' : 'Save Payment'}
              </Button>
              <Button
                onClick={resetForm}
                variant="outline"
                className="bg-muted hover:bg-muted/80 text-foreground border-border cursor-pointer"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No payments recorded for this client.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-4 text-sm font-semibold text-muted-foreground pb-2 border-b border-border">
            <div>Date</div>
            <div>Amount</div>
            <div>Method</div>
            <div>Package</div>
            <div>Notes</div>
            <div>Actions</div>
          </div>
          {payments.map((payment) => {
            const associatedPackage = personPackages.find(pp => pp.id === payment.person_package_id)
            const packageData = associatedPackage ? packages.find(pkg => pkg.id === associatedPackage.package_id) : null
            
            return (
              <div key={payment.id} className="grid grid-cols-6 gap-4 text-sm text-muted-foreground py-2 border-b border-border items-center">
                <div>
                  {new Date(payment.payment_date).toLocaleDateString()}
                </div>
                <div className="font-medium text-green-500">
                  ${Number(payment.amount).toFixed(2)}
                </div>
                <div>
                  {payment.method || '-'}
                </div>
                <div className="text-xs">
                  {packageData?.name || '-'}
                </div>
                <div className="text-xs truncate">
                  {payment.notes || '-'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(payment)}
                    className="text-muted-foreground hover:text-primary cursor-pointer"
                    title="Edit payment"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete payment"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

