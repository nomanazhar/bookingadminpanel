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
import { useLocation } from "@/components/providers/location-provider"

export default function BookingPanel({ service, rescheduleOrder }: { service: Service, rescheduleOrder?: Order | null }) {

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(!!data?.user);
    };

    checkUser();
  }, []);

  // Subservices state
  const [subservices, setSubservices] = useState<{ id: string, name: string, price: number, slug: string }[]>([]);
  const [selectedSubserviceId, setSelectedSubserviceId] = useState<string>("");
  const [subservicePrice, setSubservicePrice] = useState<number | null>(null);

  useEffect(() => {
    if (!service?.id) return setSubservices([]);
    fetch(`/api/subservices?serviceId=${service.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSubservices(data);
          setSelectedSubserviceId(data[0].id);
          setSubservicePrice(Number(data[0].price));
        } else {
          setSubservices([]);
          setSelectedSubserviceId("");
          setSubservicePrice(null);
        }
      })
      .catch(() => setSubservices([]));
  }, [service?.id]);

  const router = useRouter()
  const { toast } = useToast();

  const parseSessionOptions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.options)) return parsed.options;
      }
    } catch {}
    return [];
  };

  const servicePackages: string[] = parseSessionOptions(service?.session_options).map(opt => {
    const n = typeof opt === 'number' ? opt : parseInt(String(opt), 10);
    if (!isNaN(n)) return `${n} ${n === 1 ? 'session' : 'sessions'}`;
    return String(opt);
  });

  const [selectedPackage, setSelectedPackage] = useState<string>(
    rescheduleOrder?.session_count
      ? `${rescheduleOrder.session_count} session${rescheduleOrder.session_count > 1 ? 's' : ''}`
      : "1 session"
  )

  const [selectedDate, setSelectedDate] = useState<string | null>(rescheduleOrder?.booking_date || null)
  const [selectedTime, setSelectedTime] = useState<string | null>(rescheduleOrder?.booking_time || null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(rescheduleOrder?.doctor_id || "")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const { location: selectedLocation } = useLocation();
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastApiResponse, setLastApiResponse] = useState<any>(null)

  useEffect(() => {
    if (!servicePackages.includes(selectedPackage)) {
      const t = setTimeout(() => setSelectedPackage("1 session"), 0)
      return () => clearTimeout(t)
    }
    return
  }, [servicePackages, selectedPackage])

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

  const filteredDoctors = React.useMemo(() => {
    if (!selectedLocation) return doctors;
    return doctors.filter((doctor) =>
      Array.isArray(doctor.locations) && doctor.locations.includes(selectedLocation)
    );
  }, [doctors, selectedLocation]);

  // Use service base price for session calculations
  const effectivePrice = Number(service.base_price ?? 0);

  const getSessionCount = (label: string) => {
    const m = String(label).match(/(\d+)/)
    return m ? parseInt(m[0], 10) : 1
  }

  const getDiscount = (label: string) => {
    const n = getSessionCount(label)
    switch (n) {
      case 3: return 0.25
      case 6: return 0.35
      case 10: return 0.45
      default: return 0
    }
  }

  const formatPrice = (v: number) => `£${v.toFixed(2)}`

  const handleBook = async () => {
    if (subservices.length > 0 && !selectedSubserviceId) {
      toast({
        title: "Subservice Required",
        description: "Please select a subservice before booking",
        variant: "destructive",
      });
      return;
    }

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

    const booking = {
      service_id: service.id,
      service_name: service.name,
      subservice_id: selectedSubserviceId || null,
      subservice_name: subservices.find(s => s.id === selectedSubserviceId)?.name || null,
      package: selectedPackage,
      date: selectedDate,
      time: selectedTime,
      doctor_id: selectedDoctorId,
    }

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData?.user) {
      try { localStorage.setItem("pendingBooking", JSON.stringify(booking)) } catch {}
      setLoading(false)
      router.push("/signin")
      return
    }

    localStorage.setItem("pendingBooking", JSON.stringify(booking))
    setLoading(false)
    router.push("/confirm-booking")
  }

  return (
    <div>

      {isAuthenticated && (
      <section className="max-w-3xl mx-auto mb-8">
        <div className="bg-muted rounded-xl shadow p-4">

          {/* {subservices.length > 0 && (
            <div className="mb-4">
              <div className="text-lg font-semibold mb-2">Select Package Type</div>
              <div className="flex flex-col gap-2">
                {subservices.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subservice"
                      value={s.id}
                      checked={selectedSubserviceId === s.id}
                      onChange={() => {
                        setSelectedSubserviceId(s.id);
                        setSubservicePrice(Number(s.price));
                      }}
                    />
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      $ {Number(s.price).toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )} */}

          <div className="flex items-center justify-between mb-2">
            <div className="text-xl font-semibold">Select Package</div>
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
                const perSession = effectivePrice * (1 - discount)
                const total = perSession * count
                const totalSave = effectivePrice * count - total
              return (
                <div
                  key={p}
                  onClick={() => { setUserInteracted(true); setSelectedPackage(p) }}
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
      )}

      <ServiceDateSelector onChange={(s: { date?: string | null; time?: string | null }) => {
        setSelectedDate(s.date || null)
        setSelectedTime(s.time || null)
      }} />

      <div className="flex justify-center items-center my-8 rounded-md">
        <Button onClick={handleBook} disabled={loading}>
          {loading ? "Booking..." : "Book Treatment"}
        </Button>
      </div>

    </div>
  )
}
