"use client"
import axios from 'axios'
import React, { useState, useEffect } from 'react'
import { parseBookingDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import type { Doctor } from '@/types/database'

interface Props {
  order: any
  onSaved?: (updatedOrder: any) => void
}

export default function OrderEditCard({ order, onSaved }: Props) {
  // Initialize all form fields from order
  const [customerName, setCustomerName] = useState<string>(order?.customer_name || order?.customer?.first_name + ' ' + order?.customer?.last_name || '')
  const [customerEmail, setCustomerEmail] = useState<string>(order?.customer_email || order?.customer?.email || '')
  const [customerPhone, setCustomerPhone] = useState<string>(order?.customer_phone || '')
  const [address, setAddress] = useState<string>(order?.address || '')
  const [serviceTitle, setServiceTitle] = useState<string>(order?.service_title || '')
  const [sessionCount, setSessionCount] = useState<string>(String(order?.session_count || 1))
  const [unitPrice, setUnitPrice] = useState<string>(String(order?.unit_price || 0))
  const [discountPercent, setDiscountPercent] = useState<string>(String(order?.discount_percent || 0))
  const [totalAmount, setTotalAmount] = useState<string>(String(order?.total_amount || 0))
  const [status, setStatus] = useState<string>(order?.status || 'pending')
  const [bookingDate, setBookingDate] = useState<string>(order?.booking_date || '')
  const [bookingTime, setBookingTime] = useState<string>(order?.booking_time?.slice(0,5) || '00:00')
  const [notes, setNotes] = useState<string>(order?.notes || '')
  const [doctorId, setDoctorId] = useState<string>(order?.doctor_id || '')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)

  // Fetch doctors list
  useEffect(() => {
    axios.get('/api/doctors')
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setDoctors(data)
        }
        setLoadingDoctors(false)
      })
      .catch(() => {
        setLoadingDoctors(false)
      })
  }, [])

  // Calculate total amount when unit price, discount, or session count changes
  useEffect(() => {
    const unit = parseFloat(unitPrice) || 0
    const discount = parseFloat(discountPercent) || 0
    const sessions = parseInt(sessionCount) || 1
    const discountedPrice = unit * (1 - discount / 100)
    const total = discountedPrice * sessions
    setTotalAmount(total.toFixed(2))
  }, [unitPrice, discountPercent, sessionCount])

  const service = order?.service
  const customer = order?.customer

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        address: address || null,
        service_title: serviceTitle,
        session_count: parseInt(sessionCount) || 1,
        unit_price: parseFloat(unitPrice) || 0,
        discount_percent: parseFloat(discountPercent) || 0,
        total_amount: parseFloat(totalAmount) || 0,
        status: status,
        booking_date: bookingDate,
        booking_time: bookingTime + ':00',
        notes: notes || null,
        doctor_id: doctorId || null,
      }
      const { data } = await axios.put(`/api/orders/${order.id}`, payload)
      if (!data || data?.success === false) {
        setError(data?.error || 'Failed to update')
      } else {
        try {
          const updated = data?.data ?? data
          onSaved?.(updated)
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  const dt = parseBookingDateTime(order.booking_date, order.booking_time || '00:00:00')

  return (
    <div className="space-y-6 p-4">
      <div className="mb-2">
        <span className="inline-block bg-[#7B61FF] text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">Edit Booking</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Customer Information</h3>
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
            />
          </div>
        </div>

        {/* Service & Booking Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Service & Booking</h3>
          <div className="space-y-2">
            <Label htmlFor="serviceTitle">Service Title</Label>
            <Input
              id="serviceTitle"
              value={serviceTitle}
              onChange={(e) => setServiceTitle(e.target.value)}
              placeholder="Service title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionCount">Session Count</Label>
            <Input
              id="sessionCount"
              type="number"
              min="1"
              max="10"
              value={sessionCount}
              onChange={(e) => setSessionCount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingDate">Booking Date</Label>
            <Input
              id="bookingDate"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingTime">Booking Time</Label>
            <Input
              id="bookingTime"
              type="time"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
            />
          </div>
        </div>

        {/* Pricing Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Pricing</h3>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price (£)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountPercent">Discount (%)</Label>
            <Input
              id="discountPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount (£)</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Auto-calculated: (Unit Price × (1 - Discount%) × Sessions)</p>
          </div>
        </div>

        {/* Status & Other */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Status & Other</h3>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor (Optional)</Label>
            {loadingDoctors ? (
              <div className="text-sm text-muted-foreground">Loading doctors...</div>
            ) : (
              <Select value={doctorId || undefined} onValueChange={(value) => {
                if (value === "__clear__") {
                  setDoctorId("")
                } else {
                  setDoctorId(value)
                }
              }}>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Select a doctor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {doctorId && (
                    <SelectItem value="__clear__" className="text-muted-foreground">
                      Clear selection
                    </SelectItem>
                  )}
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name}
                      {doctor.specialization && ` - ${doctor.specialization}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        {!confirmingCancel ? (
          <>
            <Button variant="destructive" onClick={() => setConfirmingCancel(true)}>
              Cancel Booking
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="destructive" onClick={async () => {
              setSaving(true)
              setError(null)
              try {
                const { data } = await axios.patch(`/api/orders/${order.id}`, { status: 'cancelled' })
                if (data?.error) {
                  setError(data?.error || 'Failed to cancel')
                } else {
                  const updated = data?.data ?? data
                 
                  onSaved?.(updated)
                }
              } catch (err: any) {
                setError(err?.message || 'Unexpected error')
              } finally {
                setSaving(false)
                setConfirmingCancel(false)
              }
            }}>
              {saving ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
              Back
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  )
}
