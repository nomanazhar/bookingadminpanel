"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import ServiceDateSelector from "@/components/services/ServiceDateSelector"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Service, Order, Doctor } from "@/types"

export default function BookingPanel({ service, rescheduleOrder }: { service: Service, rescheduleOrder?: Order | null }) {
  const router = useRouter()
  const { toast } = useToast();
  
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
    const sessionOptions = parseSessionOptions(service?.session_options)
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
  // Generate sessions 1 to maxSessions
  const servicePackages: string[] = Array.from({ length: maxSessions }, (_, i) => {
    const count = i + 1;
    return `${count} ${count === 1 ? 'session' : 'sessions'}`;
  });
  const [selectedPackage, setSelectedPackage] = useState<string>(rescheduleOrder?.session_count ? `${rescheduleOrder.session_count} session${rescheduleOrder.session_count > 1 ? 's' : ''}` : "1 session")
  const [selectedDate, setSelectedDate] = useState<string | null>(rescheduleOrder?.booking_date || null)
  const [selectedTime, setSelectedTime] = useState<string | null>(rescheduleOrder?.booking_time || null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(rescheduleOrder?.doctor_id || "")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastApiResponse, setLastApiResponse] = useState<any>(null)

  // receive selection updates from ServiceDateSelector
  useEffect(() => {
    // ensure selectedPackage is valid when servicePackages change
    if (!servicePackages.includes(selectedPackage)) {
      const t = setTimeout(() => setSelectedPackage("1 session"), 0)
      return () => clearTimeout(t)
    }
    return
  }, [servicePackages, selectedPackage])

  // Load doctors on mount
  useEffect(() => {
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
    loadDoctors()
  }, [])

  // restore selections from pendingBooking if user is returning from confirm page (only if not rescheduling)
  useEffect(() => {
    if (rescheduleOrder) return;
    try {
      const raw = localStorage.getItem('pendingBooking')
      if (!raw) return
      const pending = JSON.parse(raw)
      if (pending?.service_id === service?.id) {
        const timers: number[] = []
        if (pending.package && servicePackages.includes(pending.package) && !userInteracted) {
          timers.push(window.setTimeout(() => setSelectedPackage(pending.package), 0))
        }
        if (pending.date) timers.push(window.setTimeout(() => setSelectedDate(pending.date), 0))
        if (pending.time) timers.push(window.setTimeout(() => setSelectedTime(pending.time), 0))
        if (pending.doctor_id) timers.push(window.setTimeout(() => setSelectedDoctorId(pending.doctor_id), 0))
        return () => timers.forEach(t => clearTimeout(t))
      }
    } catch {
      // ignore parse errors
    }
    return
  }, [service?.id, servicePackages, userInteracted, rescheduleOrder])

  const basePrice = Number(service?.base_price ?? 0)
  const getSessionCount = (label: string) => {
    const m = String(label).match(/(\d+)/)
    return m ? parseInt(m[0], 10) : 1
  }
  const getDiscount = (label: string) => {
    const n = getSessionCount(label)
    switch (n) {
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
  const formatPrice = (v: number) => `£${v.toFixed(2)}`

  const handleBook = async () => {
    if (!selectedDoctorId) {
      toast({
        title: "Doctor Selection Required",
        description: "Please select a doctor before booking",
        variant: "destructive",
      })
      return
    }
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Date and Time Required",
        description: "Please select a date and time before booking",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    // Prepare booking payload early so we can persist it for unauthenticated users
    const booking = {
      service_id: service.id,
      service_name: service.name,
      package: selectedPackage,
      date: selectedDate,
      time: selectedTime,
      doctor_id: selectedDoctorId,
    }

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      // Persist pending booking so the auth flow can resume to confirmation
      try { localStorage.setItem("pendingBooking", JSON.stringify(booking)) } catch {}
      setLoading(false)
      router.push("/signup")
      return
    }

    if (rescheduleOrder) {
      // Calculate session count and pricing for reschedule
      const sessionCount = getSessionCount(selectedPackage)
      const discountPercent = Math.round(getDiscount(selectedPackage) * 100)
      const unitPrice = Math.round((basePrice * (1 - getDiscount(selectedPackage))) * 100) / 100
      const totalAmount = Math.round((unitPrice * sessionCount) * 100) / 100

      // Update the existing order with new date, time, session count, pricing, and set status to pending
      // Perform update on server-side API to avoid client/RLS issues
      try {
        const payload = {
          service_id: service.id,
          service_title: service.name,
          booking_date: selectedDate,
          booking_time: selectedTime,
          doctor_id: selectedDoctorId,
          session_count: sessionCount,
          unit_price: unitPrice,
          discount_percent: discountPercent,
          total_amount: totalAmount,
          status: "pending",
        }

        const res = await fetch(`/api/orders/${rescheduleOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          // Ensure cookies (auth session) are forwarded so server can perform the update under the user's session
          credentials: 'same-origin',
        })

        const body = await res.json()
        setLastApiResponse(body)

        // Debug logs for troubleshooting
        console.debug('reschedule response', { status: res.status, body })

        // Treat API-level success/failure according to the JSON body.
        // The server may return HTTP 200 with success: false (e.g. no rows updated),
        // so checking only `res.ok` can show misleading success toasts.
        if (!res.ok || !body?.success) {
          console.error('Reschedule failed', { status: res.status, body })
          toast({ title: 'Reschedule Error', description: body?.error || 'Unknown error', variant: 'destructive' })
        } else {
          toast({ title: 'Reschedule Success', description: body?.data ? `Updated booking (id: ${body.data.service_title})` : 'Updated booking' })
          // redirect to my-bookings after showing the toast briefly
          setTimeout(() => router.push('/my-bookings'), 1200)
        }
      } catch (err) {
        console.error('Reschedule exception', err)
        toast({ title: 'Reschedule Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
      }

      // Clear order cache so both customer and admin see updated order
      try {
        await fetch('/api/admin/clear-orders-cache', { method: 'POST' });
      } catch { }

      setLoading(false)
      return
    }

    // Normal booking flow
    localStorage.setItem("pendingBooking", JSON.stringify(booking))
    setLoading(false)
    router.push("/confirm-booking")
  }

  // Determine allowed tabs from service.session_options (support legacy array and new object shape)
  const allowedTabs = (function getAllowed() {
    try {
      const raw = service?.session_options
      if (!raw) return undefined
      const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const times = parsed.times_of_day as string[] | undefined
        if (Array.isArray(times) && times.length > 0) return times.map(t => {
          const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
          if (cap === 'Morning' || cap === 'Afternoon' || cap === 'Evening') return cap as 'Morning' | 'Afternoon' | 'Evening'
          return cap as 'Morning' | 'Afternoon' | 'Evening'
        })
      }
    } catch { }
    return undefined
  })()

  return (
    <div>
      <section className="max-w-3xl mx-auto mb-8">
        <div className="bg-muted rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl font-semibold">Select package</div>
          </div>
          {service.description && (
            <div className="text-muted-foreground text-base mb-4">
              {service.description}
            </div>
          )}
          <div className="flex flex-col gap-4">
            {servicePackages.map((p) => {
              const count = getSessionCount(p)
              const discount = getDiscount(p)
              const perSession = basePrice * (1 - discount)
              const total = perSession * count
              const totalSave = basePrice * count - total
              return (
                <div
                  key={p}
                  onClick={() => { setUserInteracted(true); console.log('select package', p); setSelectedPackage(p) }}
                  className={`border rounded-xl px-4 py-2 flex items-center justify-between hover:shadow-md hover:bg-white hover:text-black transition cursor-pointer ${selectedPackage === p ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                >
                  <div>
                    <div className="text-lg font-semibold">{p}</div>
                    <div className="text-sm text-muted-foreground">{count} × {formatPrice(perSession)} per session</div>
                    {discount > 0 && (
                      <div className="text-xs text-green-700 mt-1">Save {Math.round(discount * 100)}% — you save {formatPrice(totalSave)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatPrice(perSession)}</div>
                    <div className="text-muted-foreground text-xs">per session</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto mb-8">
        <div className="bg-muted rounded-xl shadow p-4">
          <div className="space-y-2">
            <Label htmlFor="doctor" className="text-xl font-semibold">Select Doctor *</Label>
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                Loading doctors...
              </div>
            ) : (
              <Select
                value={selectedDoctorId || undefined}
                onValueChange={(value) => {
                  setSelectedDoctorId(value)
                }}
                required
              >
                <SelectTrigger id="doctor" className="w-full bg-white">
                  <SelectValue placeholder="Select a doctor (required)" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {doctors.length === 0 ? (
                    <SelectItem value="__no_doctors__" disabled>
                      No doctors available
                    </SelectItem>
                  ) : (
                    doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                        {doctor.specialization && ` - ${doctor.specialization}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {!selectedDoctorId && !loadingDoctors && doctors.length > 0 && (
              <p className="text-sm text-destructive mt-1">Please select a doctor to continue</p>
            )}
          </div>
        </div>
      </section>

      <ServiceDateSelector allowedTabs={allowedTabs} onChange={(s: { date?: string | null; time?: string | null }) => {
        setSelectedDate(s.date || null)
        setSelectedTime(s.time || null)
      }} />

      <div className="flex justify-center items-center my-8">
        <Button onClick={handleBook} className="bg-[#333] text-white text-lg font-semibold rounded-full px-10 py-4 shadow-md hover:bg-[#222] transition-all" style={{ minWidth: 320 }} disabled={loading}>
          {loading ? (rescheduleOrder ? "Updating..." : "Booking...") : (rescheduleOrder ? "Update Your Booking" : "Book Treatment")}
        </Button>
      </div>

        {process.env.NODE_ENV !== 'production' && lastApiResponse && (
          <div className="max-w-3xl mx-auto mt-4 p-3 rounded-md bg-red-50 text-sm text-red-900">
            <div className="font-medium mb-2">API Response (dev)</div>
            <pre className="whitespace-pre-wrap break-words text-xs max-h-48 overflow-auto">{JSON.stringify(lastApiResponse, null, 2)}</pre>
          </div>
        )}
    </div>
  )
}
