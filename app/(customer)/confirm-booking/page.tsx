"use client";
export const dynamic = "force-static";
import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { parseBookingDateTime } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export default function ConfirmBookingPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [serviceDetails, setServiceDetails] = useState<any | null>(null);
  const [doctorDetails, setDoctorDetails] = useState<any | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const raw = localStorage.getItem("pendingBooking");
    if (raw) setBooking(JSON.parse(raw));

    const supabase = createClient();
    supabase.auth.getUser().then(async (res) => {
      if (res.data?.user) {
        setUser(res.data.user);
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", res.data.user.id)
            .single();
          if (prof) setProfile(prof);
        } catch (e) {
          // ignore
        }
      } else {
        setNeedsAuth(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!booking?.service_id) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("services")
          .select("*")
          .eq("id", booking.service_id)
          .single();
        if (data) setServiceDetails(data);
      } catch (e) {
        // ignore
      }
    })();
  }, [booking]);

  useEffect(() => {
    if (!booking?.doctor_id) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("doctors")
          .select("*")
          .eq("id", booking.doctor_id)
          .single();
        if (data) setDoctorDetails(data);
      } catch (e) {
        // ignore
      }
    })();
  }, [booking]);

  const getSessionCount = (label: string) => {
    const m = String(label).match(/(\d+)/);
    return m ? parseInt(m[0], 10) : 1;
  };
  const getDiscount = (label: string) => {
    const n = getSessionCount(label);
    switch (n) {
      case 3:
        return 0.25;
      case 6:
        return 0.35;
      case 10:
        return 0.45;
      default:
        return 0;
    }
  };
  const formatPrice = (v: number) => `£${v.toFixed(2)}`;

  const handleConfirm = async () => {
    if (!booking) return;
    if (!booking.doctor_id) {
      toast({
        title: "Doctor Selection Required",
        description:
          "Please go back and select a doctor before confirming your booking",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const basePrice = Number(serviceDetails?.base_price ?? 0);
      const sessionCount = getSessionCount(booking.package);
      const discountPercent = Math.round(getDiscount(booking.package) * 100);
      const unitPrice =
        Math.round(basePrice * (1 - getDiscount(booking.package)) * 100) / 100;
      const totalAmount = Math.round(unitPrice * sessionCount * 100) / 100;

      const payload = {
        service_id: booking.service_id,
        service_title: booking.service_name,
        package: booking.package,
        date: booking.date,
        time: booking.time,
        doctor_id: booking.doctor_id,
        address: address,
        phone: phone,
        notes: null,
        unit_price: unitPrice,
        session_count: sessionCount,
        discount_percent: discountPercent,
        total_amount: totalAmount,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err?.error || "Failed to create booking");
        setLoading(false);
        return;
      }
      toast({
        title: "Booking confirmed",
        description: "Your appointment has been created.",
      });
      localStorage.removeItem("pendingBooking");
      router.push("/book-consultation");
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  if (!booking)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="bg-white/80 rounded-xl shadow-lg p-10 text-center">
          <h2 className="text-2xl font-semibold mb-2 text-gray-700">No pending booking found.</h2>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] flex flex-col items-center py-10 px-2">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-muted-foreground px-2 py-1"
            onClick={() =>
              router.push(
                serviceDetails?.slug
                  ? `/customer-services/${serviceDetails.slug}`
                  : "/customer-services"
              )
            }
          >
            ← Back to Services
          </Button>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
          <h2 className="text-3xl font-bold mb-2 text-center text-primary tracking-tight">
            Confirm Your Booking
          </h2>
          <p className="text-center text-gray-500 mb-8 text-sm">
            Please review your details and confirm your appointment below.
          </p>

          <form
            className="space-y-6"
            onSubmit={e => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Service
                </label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {booking.service_name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Package
                </label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {booking.package}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Doctor
                </label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {doctorDetails
                    ? `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}${doctorDetails.specialization ? ` - ${doctorDetails.specialization}` : ''}`
                    : booking.doctor_id
                    ? "Loading..."
                    : "Not selected"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Date
                </label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {(() => {
                    try {
                      const d = parseBookingDateTime(booking.date, "00:00:00");
                      return d.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    } catch {
                      return booking.date;
                    }
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Time
                </label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {(() => {
                    try {
                      const dt = parseBookingDateTime(booking.date, booking.time);
                      return dt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                    } catch {
                      return booking.time;
                    }
                  })()}
                </div>
              </div>
            </div>

            {needsAuth && !user ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
                <p className="mb-4 text-yellow-900 font-medium">
                  Please sign in to confirm your pending booking.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/signin")}>Sign In</Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/")}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Name
                    </label>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                      {user?.user_metadata?.first_name || ""} {user?.user_metadata?.last_name || ""}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Email
                    </label>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                      {user?.email || ""}
                    </div>
                  </div>
                </div>

                {serviceDetails && (() => {
                  const basePrice = Number(serviceDetails.base_price ?? 0);
                  const count = getSessionCount(booking.package);
                  const discount = getDiscount(booking.package);
                  const perSession = basePrice * (1 - discount);
                  const total = perSession * count;
                  const totalSave = basePrice * count - total;
                  return (
                    <div className="mb-2 mt-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200 shadow-sm">
                        <div>
                          <div className="text-2xl font-bold text-green-800">{formatPrice(total)}</div>
                          <div className="text-xs text-muted-foreground">{count} × {formatPrice(perSession)} per session</div>
                        </div>
                        <div className="text-right mt-2 md:mt-0">
                          {discount > 0 ? (
                            <div className="text-sm text-green-700 font-semibold">Save {Math.round(discount * 100)}% — {formatPrice(totalSave)}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No discount</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Address (optional)
                    </label>
                    <Input
                      value={address}
                      onChange={(e: any) => setAddress(e.target.value)}
                      placeholder="Enter delivery address (optional)"
                      className="bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Phone (optional)
                    </label>
                    <Input
                      value={phone}
                      onChange={(e: any) => setPhone(e.target.value)}
                      placeholder="Enter phone number (optional)"
                      className="bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary rounded-lg px-3 py-2"
                      type="tel"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mt-8">
                  <Button
                    type="submit"
                    className="w-full md:w-auto px-8 py-2 text-lg text-bl font-semibold rounded-lg shadow-md bg-primary hover:bg-primary/90 transition"
                    disabled={loading}
                  >
                    {loading ? "Confirming..." : "Confirm Booking"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full md:w-auto px-8 py-2 text-lg rounded-lg border border-gray-200"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
