"use client"
import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { parseBookingDateTime } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export default function ConfirmBookingPage() {
  const router = useRouter()
  const [booking, setBooking] = useState<any | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [serviceDetails, setServiceDetails] = useState<any | null>(null)
  const [doctorDetails, setDoctorDetails] = useState<any | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const raw = localStorage.getItem('pendingBooking')
    if (raw) setBooking(JSON.parse(raw))

    const supabase = createClient()
    supabase.auth.getUser().then(async (res) => {
      if (res.data?.user) {
        setUser(res.data.user)
        try {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', res.data.user.id).single()
          if (prof) setProfile(prof)
        } catch (e) {
          // ignore
        }
      } else {
        // Instead of an immediate redirect, show a friendly call-to-action
        // so the user can navigate to sign in and return to confirm booking.
        setNeedsAuth(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!booking?.service_id) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('services').select('*').eq('id', booking.service_id).single()
        if (data) setServiceDetails(data)
      } catch (e) {
        // ignore
      }
    })()
  }, [booking])

  useEffect(() => {
    if (!booking?.doctor_id) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('doctors').select('*').eq('id', booking.doctor_id).single()
        if (data) setDoctorDetails(data)
      } catch (e) {
        // ignore
      }
    })()
  }, [booking])

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

  const handleConfirm = async () => {
    if (!booking) return
    
    if (!booking.doctor_id) {
      toast({
        title: "Doctor Selection Required",
        description: "Please go back and select a doctor before confirming your booking",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    try {
      const basePrice = Number(serviceDetails?.base_price ?? 0)
      const sessionCount = getSessionCount(booking.package)
      const discountPercent = Math.round(getDiscount(booking.package) * 100)
      const unitPrice = Math.round((basePrice * (1 - getDiscount(booking.package))) * 100) / 100
      const totalAmount = Math.round((unitPrice * sessionCount) * 100) / 100

      const payload = {
        service_id: booking.service_id,
        service_title: booking.service_name,
        package: booking.package,
        date: booking.date,
        time: booking.time,
        doctor_id: booking.doctor_id,
        address: address,
        notes: null,
        unit_price: unitPrice,
        session_count: sessionCount,
        discount_percent: discountPercent,
        total_amount: totalAmount,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err?.error || 'Failed to create booking')
        setLoading(false)
        return
      }
      // success toast, clear pending and redirect
      toast({ title: 'Booking confirmed', description: 'Your appointment has been created.' })
      localStorage.removeItem('pendingBooking')
      router.push('/book-consultation')
    } catch (e) {
      alert('Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  if (!booking) return <div className="p-8">No pending booking found.</div>
  return (
    <>
      <div className="max-w-2xl mx-auto p-8">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push(serviceDetails?.slug ? `/services/${serviceDetails.slug}` : '/services')}>← Back to Services</Button>
      </div>
      <div className="bg-muted rounded-xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Confirm Booking</h2>
        <div className="mb-2">Service: <strong>{booking.service_name}</strong></div>
        <div className="mb-2">Package: <strong>{booking.package}</strong></div>
        <div className="mb-2">Doctor: <strong>{doctorDetails ? `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}${doctorDetails.specialization ? ` - ${doctorDetails.specialization}` : ''}` : booking.doctor_id ? 'Loading...' : 'Not selected'}</strong></div>
        <div className="mb-2">Date: <strong>{(() => {
          try {
            const d = parseBookingDateTime(booking.date, '00:00:00')
            return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
          } catch { return booking.date }
        })()}</strong></div>
        <div className="mb-2">Time: <strong>{(() => {
          try {
            const dt = parseBookingDateTime(booking.date, booking.time)
            return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
          } catch { return booking.time }
        })()}</strong></div>

        {needsAuth && !user ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="mb-4">Please sign in to confirm your pending booking.</p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/signin')}>Sign In</Button>
              <Button variant="ghost" onClick={() => router.push('/')}>Back to Dashboard</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2">Name: <strong>{user?.user_metadata?.first_name || ''} {user?.user_metadata?.last_name || ''}</strong></div>
            <div className="mb-4">Email: <strong>{user?.email || ''}</strong></div>
                  {serviceDetails && (
                    (() => {
                      const basePrice = Number(serviceDetails.base_price ?? 0)
                      const count = getSessionCount(booking.package)
                      const discount = getDiscount(booking.package)
                      const perSession = basePrice * (1 - discount)
                      const total = perSession * count
                      const totalSave = basePrice * count - total
                      return (
                        <div className="mb-4 p-4 bg-white rounded-md shadow-sm text-black">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="text-lg font-semibold">{formatPrice(total)}</div>
                              <div className="text-xs text-muted-foreground">{count} × {formatPrice(perSession)} per session</div>
                            </div>
                            <div className="text-right">
                              {discount > 0 ? (
                                <div className="text-sm text-green-700">Save {Math.round(discount * 100)}% — {formatPrice(totalSave)}</div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No discount</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  )}

            <div className="mb-4">
              <label className="block mb-2">Address</label>
              <Input value={address} onChange={(e:any) => setAddress(e.target.value)} placeholder="Enter delivery address" />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleConfirm} disabled={loading}>{loading ? 'Confirming...' : 'Confirm Booking'}</Button>
              <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
