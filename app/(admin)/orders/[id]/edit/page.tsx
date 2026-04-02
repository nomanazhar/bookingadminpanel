"use client";

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
import type { OrderWithDetails, Doctor, Service } from "@/types"

// Helper: convert 12h time (e.g., "10:15 am") to 24h (e.g., "10:15")
function time12hTo24h(time12h: string): string {
  const [time, ampm] = time12h.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Helper: generate time slots (all day 08:00-21:00 in 15-min intervals)
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let min = 8 * 60; min <= 21 * 60; min += 15) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hour = h.toString().padStart(2, "0");
    const minute = m.toString().padStart(2, "0");
    slots.push(`${hour}:${minute}`);
  }
  return slots;
}

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
  const [services, setServices] = useState<Service[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(generateAllTimeSlots())
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)

  // Form fields
  const [customerName, setCustomerName] = useState<string>("")
  const [customerEmail, setCustomerEmail] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [serviceTitle, setServiceTitle] = useState<string>("")
  const [serviceId, setServiceId] = useState<string>("")
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
          router.push("/orders")
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
        setServiceId(orderData.service_id || '')
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load order",
          variant: "destructive",
        })
        router.push("/orders")
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadOrder()
    }
  }, [orderId, router, toast])

  // Fetch services list
  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setServices(data)
        }
      })
      .catch(err => {
        console.error("Failed to fetch services:", err)
      })
  }, [])

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

  // Fetch available time slots when date, doctor, or service changes
  useEffect(() => {
    if (!bookingDate || !serviceId) {
      setAvailableTimeSlots(generateAllTimeSlots())
      return
    }

    let ignore = false

    const fetchAvailableTimes = async () => {
      try {
        setLoadingTimeSlots(true)

        if (doctorId) {
          const res = await fetch(
            `/api/available-timeslots?date=${bookingDate}&doctorId=${doctorId}&serviceId=${serviceId}`
          )
          if (!res.ok) throw new Error("Failed to fetch available times")
          const data = await res.json()

          if (!ignore) {
            // Convert 12h format to 24h format
            const slots24h = (data.slots || []).map((slot: string) => time12hTo24h(slot))
            // Fallback to all slots if API returns empty
            const finalSlots = slots24h.length > 0 ? slots24h : generateAllTimeSlots()
            setAvailableTimeSlots(finalSlots)
          }
        } else {
          // If no doctor selected, show all available slots
          if (!ignore) {
            setAvailableTimeSlots(generateAllTimeSlots())
          }
        }
      } catch (err) {
        console.error("Failed to fetch time slots:", err)
        if (!ignore) {
          // Fallback to all slots
          setAvailableTimeSlots(generateAllTimeSlots())
        }
      } finally {
        if (!ignore) {
          setLoadingTimeSlots(false)
        }
      }
    }

    fetchAvailableTimes()

    return () => {
      ignore = true
    }
  }, [bookingDate, doctorId, serviceId])

  // Validate bookingTime against available slots
  useEffect(() => {
    if (!bookingTime || availableTimeSlots.length === 0) return
    if (!availableTimeSlots.includes(bookingTime)) {
      setBookingTime(availableTimeSlots[0] || "00:00")
    }
  }, [availableTimeSlots, bookingTime])

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
      router.push("/orders")
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
    <div className="bg-white p-6 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="primary" size="icon" className="h-6 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Edit Booking</h1>
        </div>
      </div>

      {/* Form Card */}
      <Card>

        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
          <CardDescription>Update the booking details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Customer Details</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer full name"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
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
                    placeholder="+44 123 456 7890"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Service Details</h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label>Services <span className="text-destructive italic">(Select one)</span></Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto bg-background">
                    {services.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No services available</div>
                    ) : (
                      services.map((service) => (
                        <label
                          key={service.id}
                          className="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={serviceId === service.id}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setServiceId(service.id)
                                setServiceTitle(service.name || "")
                                setUnitPrice(String(service.base_price ?? 0))
                              } else {
                                setServiceId("")
                                setServiceTitle("")
                                setUnitPrice("0")
                              }
                            }}
                            className="mt-1 w-4 h-4 rounded border-input"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              £{Number(service.base_price || 0).toFixed(2)}
                              {service.duration_minutes && ` • ${service.duration_minutes} min`}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor <span className="italic">(Optional)</span></Label>
                    {loadingDoctors ? (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                        Loading Therapists...
                      </div>
                    ) : (
                      <Select value={doctorId || undefined} onValueChange={(value) => setDoctorId(value === "__clear__" ? "" : value)}>
                        <SelectTrigger id="doctor">
                          <SelectValue placeholder="Select a Therapist (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctorId && (
                            <SelectItem value="__clear__" className="text-muted-foreground">Clear selection</SelectItem>
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

                    <div className="space-y-2 ">
                      <Label htmlFor="sessionCount">Sessions</Label>
                      <Input
                        id="sessionCount"
                        type="number"
                        min={1}
                        max={10}
                        value={sessionCount}
                        onChange={(e) => setSessionCount(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes (optional)"
                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                    </div>
                </div>

                <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="bookingDate">Date</Label>
                    <Input
                      id="bookingDate"
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookingTime">Time</Label>
                    {!bookingDate ? (
                      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                        Select a date first
                      </div>
                    ) : loadingTimeSlots ? (
                      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                        Loading available times...
                      </div>
                    ) : availableTimeSlots.length === 0 ? (
                      <div className="flex items-center justify-center py-2 text-sm text-destructive border rounded-md bg-muted">
                        No available times for this date{doctorId ? " and therapist" : ""}
                      </div>
                    ) : (
                      <Select value={bookingTime} onValueChange={setBookingTime} required>
                        <SelectTrigger id="bookingTime">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

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
                  
                </div>
              </div>
            </div>

           {/* Pricing box */}
                  <div className="mt-4 p-4 bg-muted rounded-md border">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">Selected Service:</span>
                        <span className="text-sm">{serviceTitle || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold">£{Number(totalAmount || 0).toFixed(2)}</span>
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
