"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { OrderWithDetails, Doctor } from "@/types"

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const orderId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)

  // Form fields
  const [customerName, setCustomerName] = useState<string>("")
  const [customerEmail, setCustomerEmail] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [serviceTitle, setServiceTitle] = useState<string>("")
  const [sessionCount, setSessionCount] = useState<string>("1")
  const [unitPrice, setUnitPrice] = useState<string>("0")
  const [discountPercent, setDiscountPercent] = useState<string>("0")
  const [totalAmount, setTotalAmount] = useState<string>("0")
  const [status, setStatus] = useState<string>("pending")
  const [bookingDate, setBookingDate] = useState<string>("")
  const [bookingTime, setBookingTime] = useState<string>("00:00")
  const [notes, setNotes] = useState<string>("")
  const [doctorId, setDoctorId] = useState<string>("")

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) throw new Error("Failed to fetch order")

        const orderData = await res.json()
        if (!orderData) {
          toast({
            title: "Error",
            description: "Order not found",
            variant: "destructive",
          })
          router.push("/admin/orders")
          return
        }

        setOrder(orderData)
        setCustomerName(orderData.customer_name || orderData.customer?.first_name + ' ' + orderData.customer?.last_name || '')
        setCustomerEmail(orderData.customer_email || orderData.customer?.email || '')
        setCustomerPhone(orderData.customer_phone || '')
        setAddress(orderData.address || '')
        setServiceTitle(orderData.service_title || '')
        setSessionCount(String(orderData.session_count || 1))
        setUnitPrice(String(orderData.unit_price || 0))
        setDiscountPercent(String(orderData.discount_percent || 0))
        setTotalAmount(String(orderData.total_amount || 0))
        setStatus(orderData.status || 'pending')
        setBookingDate(orderData.booking_date || '')
        setBookingTime(orderData.booking_time?.slice(0, 5) || '00:00')
        setNotes(orderData.notes || '')
        setDoctorId(orderData.doctor_id || '')
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load order",
          variant: "destructive",
        })
        router.push("/admin/orders")
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadOrder()
    }
  }, [orderId, router, toast])

  // Fetch doctors list
  useEffect(() => {
    fetch('/api/doctors')
      .then(res => res.json())
      .then(data => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!customerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      })
      return
    }

    if (!customerEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer email is required",
        variant: "destructive",
      })
      return
    }

    if (!serviceTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Service title is required",
        variant: "destructive",
      })
      return
    }

    if (!bookingDate) {
      toast({
        title: "Validation Error",
        description: "Booking date is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || null,
        address: address.trim() || null,
        service_title: serviceTitle.trim(),
        session_count: parseInt(sessionCount) || 1,
        unit_price: parseFloat(unitPrice) || 0,
        discount_percent: parseFloat(discountPercent) || 0,
        total_amount: parseFloat(totalAmount) || 0,
        status: status,
        booking_date: bookingDate,
        booking_time: bookingTime + ':00',
        notes: notes.trim() || null,
        doctor_id: doctorId || null,
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to update order')
      }

      // Clear cache
      try {
        await fetch('/api/admin/clear-orders-cache', { method: 'POST' })
      } catch {}

      toast({
        title: "Success",
        description: "Order updated successfully!",
      })

      // Navigate back to orders page
      router.push("/admin/orders")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Edit Booking</h1>
          <p className="text-muted-foreground">Update booking information</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
          <CardDescription>Update the booking details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Customer Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address (optional)"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Service & Booking Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Service & Booking</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serviceTitle">Service Title *</Label>
                  <Input
                    id="serviceTitle"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="Service title"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionCount">Session Count *</Label>
                  <Input
                    id="sessionCount"
                    type="number"
                    min="1"
                    max="10"
                    value={sessionCount}
                    onChange={(e) => setSessionCount(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookingDate">Booking Date *</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookingTime">Booking Time *</Label>
                  <Input
                    id="bookingTime"
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    required
                    className="w-full"
                  />
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
                      <SelectTrigger id="doctor" className="w-full bg-white">
                        <SelectValue placeholder="Select a doctor (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
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
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Pricing</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (£) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                    className="w-full"
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
                    className="w-full"
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
                    readOnly
                    className="w-full bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated</p>
                </div>
              </div>
            </div>

            {/* Status & Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Status & Notes</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                    rows={4}
                    className="w-full min-h-[100px] border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !customerName || !customerEmail || !serviceTitle || !bookingDate}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
