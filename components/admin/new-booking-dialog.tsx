"use client"
import axios from 'axios'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Service, Doctor } from "@/types"

interface NewBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingCreated?: () => void
  defaultDoctorId?: string | null
}

export function NewBookingDialog({
  open,
  onOpenChange,
  onBookingCreated,
  defaultDoctorId,
}: NewBookingDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  // Form fields
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(defaultDoctorId || "")
  const [selectedSessions, setSelectedSessions] = useState("1")
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  // Load services and doctors when dialog opens
  useEffect(() => {
    if (open) {
      loadServices()
      loadDoctors()
      // Auto-select doctor if provided
      if (defaultDoctorId) {
        setSelectedDoctorId(defaultDoctorId)
      }
    } else {
      // Reset form when dialog closes
      setCustomerName("")
      setCustomerEmail("")
      setCustomerPhone("")
      setSelectedServiceId("")
      setSelectedDoctorId(defaultDoctorId || "")
      setSelectedSessions("1")
      setBookingDate("")
      setBookingTime("")
      setAddress("")
      setNotes("")
    }
  }, [open, defaultDoctorId])

  const loadDoctors = async () => {
    setLoadingDoctors(true)
    try {
      const { data } = await axios.get("/api/doctors")
      if (Array.isArray(data)) {
        setDoctors(data.filter((d: Doctor) => d.is_active))
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
      try {
        const { data } = await axios.get("/api/services")
        setServices(data)
      } catch {
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

      const { data } = await axios.post("/api/admin/orders", payload)
      if (!data || data.success === false) {
        throw new Error(data.error || "Failed to create booking")
      }

      toast({
        title: "Success",
        description: "Booking created successfully",
      })

      // Reset form
      setCustomerName("")
      setCustomerEmail("")
      setCustomerPhone("")
      setSelectedServiceId("")
      setSelectedDoctorId(defaultDoctorId || "")
      setSelectedSessions("1")
      setBookingDate("")
      setBookingTime("")
      setAddress("")
      setNotes("")

      onOpenChange(false)
      onBookingCreated?.()
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-2xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-2xl">Create New Booking</SheetTitle>
          <SheetDescription>
            Create a new booking with customer details
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Customer Details Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Customer Details</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
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
            <h3 className="text-base font-semibold text-foreground">Service Details</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="service">Service *</Label>
                {loadingServices ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
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
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    Loading doctors...
                  </div>
                ) : (
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
                  {selectedSessions && totalPrice > 0 && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Amount:</span>
                        <span className="text-lg font-bold">£{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Date & Time Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Booking Date & Time</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <h3 className="text-base font-semibold text-foreground">Additional Details</h3>
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
                  className="w-full min-h-[100px] border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <SheetFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !customerName || !customerEmail || !selectedServiceId || !bookingDate || !bookingTime}
              className="w-full sm:w-auto"
            >
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

