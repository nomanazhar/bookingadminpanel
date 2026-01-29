"use client";

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import type { Service, Doctor } from "@/types"

export default function NewBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  // Get doctor_id from URL params (if coming from doctor's bookings page)
  const doctorIdFromUrl = searchParams?.get('doctor_id') || null
  const duplicateOrderId = searchParams?.get('duplicate') || null

  // Form fields
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorIdFromUrl || "")
  const [selectedSessions, setSelectedSessions] = useState("1")
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  // Duplication logic: if duplicateOrderId is present, fetch order and prefill fields
  useEffect(() => {
    if (!duplicateOrderId) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${duplicateOrderId}`);
        if (!res.ok) throw new Error("Failed to fetch order for duplication");
        const order = await res.json();
        setCustomerName(order.customer_name || order.customer?.first_name + ' ' + order.customer?.last_name || "");
        setCustomerEmail(order.customer_email || order.customer?.email || "");
        setCustomerPhone(order.customer_phone || "");
        setAddress(order.address || "");
        setSelectedServiceId(order.service_id || "");
        setSelectedDoctorId(order.doctor_id || "");
        setSelectedSessions(String(order.session_count || 1));
        setBookingDate(order.booking_date || "");
        setBookingTime(order.booking_time?.slice(0,5) || "00:00");
        setNotes(order.notes || "");
      } catch (e) {
        toast({ title: "Duplication Error", description: (e as Error).message, variant: "destructive" });
      }
    })();
  }, [duplicateOrderId]);

  // Load services and doctors on mount
  useEffect(() => {
    loadServices()
    loadDoctors()
  }, [])

  // Auto-select doctor if coming from doctor's bookings page
  useEffect(() => {
    if (doctorIdFromUrl) {
      setSelectedDoctorId(doctorIdFromUrl)
    }
  }, [doctorIdFromUrl])

  const loadDoctors = async () => {
    setLoadingDoctors(true)
    try {
      const res = await fetch("/api/doctors")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setDoctors(data.filter((d: Doctor) => d.is_active))
        }
      }
    } catch (error) {
      console.error("Failed to load doctors:", error)
    } finally {
      setLoadingDoctors(false)
    }
  }

  // Load selected service details
  const selectedService = services.find((s) => s.id === selectedServiceId)
  
  // Parse session_options from service to determine max sessions
  const parseSessionOptions = (raw: any): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.options)) return parsed.options
      }
    } catch {}
    return []
  }
  
  // Extract maximum session count from session_options
  const getMaxSessions = (): number => {
    if (!selectedService) return 10 // Default to 10 if no service selected
    const sessionOptions = parseSessionOptions(selectedService?.session_options)
    if (sessionOptions.length === 0) return 10 // Default to 10 if no options
    
    let maxSession = 1
    sessionOptions.forEach((opt: string) => {
      const match = String(opt).match(/(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxSession) maxSession = num
      }
    })
    return Math.max(1, Math.min(10, maxSession)) // Clamp between 1 and 10
  }
  
  const maxSessions = getMaxSessions()
  // Generate sessions options dynamically based on selected service
  const sessionsOptions = Array.from({ length: maxSessions }, (_, i) => (i + 1).toString())
  
  // Reset selectedSessions if it exceeds max when service changes
  useEffect(() => {
    if (selectedServiceId) {
      const currentSessions = parseInt(selectedSessions, 10)
      if (currentSessions > maxSessions || currentSessions < 1) {
        setSelectedSessions("1")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId, maxSessions])

  const loadServices = async () => {
    setLoadingServices(true)
    try {
      const res = await fetch("/api/services")
      if (res.ok) {
        const data = await res.json()
        setServices(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load services",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      })
    } finally {
      setLoadingServices(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!customerName || !customerEmail) {
      toast({
        title: "Validation Error",
        description: "Please provide customer name and email",
        variant: "destructive",
      })
      return
    }

    if (!selectedServiceId) {
      toast({
        title: "Validation Error",
        description: "Please select a service",
        variant: "destructive",
      })
      return
    }

    if (!bookingDate || !bookingTime) {
      toast({
        title: "Validation Error",
        description: "Please select booking date and time",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const selectedServiceData = services.find((s) => s.id === selectedServiceId)
      
      const sessionsNum = parseInt(selectedSessions, 10)
      const discount = getDiscount(sessionsNum)
      const basePrice = Number(selectedServiceData?.base_price ?? 0)
      const unitPrice = Math.round((basePrice * (1 - discount)) * 100) / 100
      const calculatedTotal = unitPrice * sessionsNum

      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        service_id: selectedServiceId,
        doctor_id: selectedDoctorId || null,
        service_title: selectedServiceData?.name || "",
        package: `${selectedSessions} session${selectedSessions !== "1" ? "s" : ""}`,
        sessions: sessionsNum,
        unit_price: unitPrice,
        discount_percent: Math.round(discount * 100),
        total_amount: calculatedTotal,
        booking_date: bookingDate,
        booking_time: bookingTime,
        address: address || null,
        notes: notes || null,
      }

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking")
      }

      toast({
        title: "Success",
        description: "Booking created successfully",
      })

      // Navigate back to orders page
      router.push("/orders")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get discount based on number of sessions
  const getDiscount = (sessions: number): number => {
    switch (sessions) {
      case 3:
        return 0.25
      case 6:
        return 0.35
      case 10:
        return 0.45
      default:
        return 0
    }
  }

  // Calculate price
  const calculatePrice = () => {
    if (!selectedService) return 0
    const basePrice = Number(selectedService.base_price ?? 0)
    const sessionCount = parseInt(selectedSessions, 10)
    const discount = getDiscount(sessionCount)
    const perSession = basePrice * (1 - discount)
    return perSession * sessionCount
  }

  const totalPrice = calculatePrice()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Create New Booking</h1>
          <p className="text-muted-foreground">Create a new booking with customer details</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
          <CardDescription>Fill in the details to create a new booking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Customer Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerName">Full Name *</Label>
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
                  <Label htmlFor="customerEmail">Email *</Label>
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
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+44 123 456 7890"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Service Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Service Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                      Loading services...
                    </div>
                  ) : (
                    <Select
                      value={selectedServiceId}
                      onValueChange={setSelectedServiceId}
                      required
                    >
                      <SelectTrigger id="service" className="w-full">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - £{Number(service.base_price || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor (Optional)</Label>
                  {loadingDoctors ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                      Loading doctors...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select
                        value={selectedDoctorId || undefined}
                        onValueChange={(value) => {
                          // Handle special "clear" value
                          if (value === "__clear__") {
                            setSelectedDoctorId("")
                          } else {
                            setSelectedDoctorId(value)
                          }
                        }}
                      >
                        <SelectTrigger id="doctor" className="w-full">
                          <SelectValue placeholder="Select a doctor (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDoctorId && (
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
                    </div>
                  )}
                </div>

                {selectedService && (
                  <div className="space-y-2">
                    <Label htmlFor="sessions">Sessions *</Label>
                    <Select
                      value={selectedSessions}
                      onValueChange={setSelectedSessions}
                      required
                    >
                      <SelectTrigger id="sessions" className="w-full">
                        <SelectValue placeholder="Select number of sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionsOptions.map((sessions) => (
                          <SelectItem key={sessions} value={sessions}>
                            {sessions} {parseInt(sessions) === 1 ? "session" : "sessions"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSessions && totalPrice > 0 && (
                  <div className="md:col-span-2">
                    <div className="p-4 bg-muted rounded-md border">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold">£{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Date & Time Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Booking Date & Time</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bookingDate">Date *</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookingTime">Time *</Label>
                  <Input
                    id="bookingTime"
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Additional Details</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Customer address (optional)"
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
                    className="w-full min-h-[120px] border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !customerName || !customerEmail || !selectedServiceId || !bookingDate || !bookingTime}
              >
                {loading ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

