"use client";
export const dynamic = "force-static";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBookingDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface PendingBooking {
  service_id: string;
  service_name: string;
  package: string;
  date: string;
  time: string;
  doctor_id?: string;
  // ... other fields you might have
  session_count?: number;
  unit_price?: number;
  discount_percent?: number;
  total_amount?: number;
}

export default function ConfirmBookingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [booking, setBooking] = useState<PendingBooking | null>(null);
  const [user, setUser] = useState<any>(null);           // ← consider better typing later
  const [profile, setProfile] = useState<any>(null);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [doctorDetails, setDoctorDetails] = useState<any>(null);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Load pending booking + user data
  useEffect(() => {
    const raw = localStorage.getItem("pendingBooking");
    if (raw) {
      try {
        setBooking(JSON.parse(raw));
      } catch {
        console.error("Failed to parse pendingBooking from localStorage");
      }
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        setNeedsAuth(true);
        return;
      }

      setUser(data.user);

      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (prof) setProfile(prof);
      } catch {
        // silent fail — optional logging
      }
    });
  }, []);

  // Load service
  useEffect(() => {
    if (!booking?.service_id) return;

    (async () => {
      const supabase = createClient();
      try {
        const { data } = await supabase
          .from("services")
          .select("*")
          .eq("id", booking.service_id)
          .single();

        if (data) setServiceDetails(data);
      } catch {
        // silent fail
      }
    })();
  }, [booking?.service_id]);

  // Load doctor
  useEffect(() => {
    if (!booking?.doctor_id) return;

    (async () => {
      const supabase = createClient();
      try {
        const { data } = await supabase
          .from("doctors")
          .select("*")
          .eq("id", booking.doctor_id)
          .single();

        if (data) setDoctorDetails(data);
      } catch {
        // silent fail
      }
    })();
  }, [booking?.doctor_id]);

  // ─── Helpers ────────────────────────────────────────────────
  const getSessionCount = (label: string): number => {
    const match = String(label).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const getDiscountRate = (label: string): number => {
    const count = getSessionCount(label);
    switch (count) {
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

  const formatPrice = (value: number): string => `£${value.toFixed(2)}`;

  const handleConfirm = async () => {
    if (!booking) return;
    if (!booking.doctor_id) {
      toast({
        title: "Therapist Selection Required",
        description: "Please go back and select a therapist before confirming.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const basePrice = Number(serviceDetails?.base_price ?? 0);
      const sessionCount = booking.session_count ?? getSessionCount(booking.package);
      const discountRate = getDiscountRate(booking.package);

      const unitPrice = Math.round(basePrice * (1 - discountRate) * 100) / 100;
      const totalAmount = Math.round(unitPrice * sessionCount * 100) / 100;

      const payload = {
        service_id: booking.service_id,
        service_title: booking.service_name,
        package: booking.package,
        date: booking.date,
        time: booking.time,
        doctor_id: booking.doctor_id,
        address: address || null,
        phone: phone || null,
        notes: null,
        unit_price: unitPrice,
        session_count: sessionCount,
        discount_percent: Math.round(discountRate * 100),
        total_amount: totalAmount,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Booking Failed",
          description: err?.error || "Failed to create booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Booking Confirmed",
        description: "Your appointment has been successfully created.",
      });

      localStorage.removeItem("pendingBooking");
      router.push("/book-consultation");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="bg-white/80 rounded-xl shadow-lg p-10 text-center">
          <h2 className="text-2xl font-semibold mb-2 text-gray-700">
            No pending booking found.
          </h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] flex flex-col items-center py-10 px-2">
        <div className="w-full max-w-2xl ">
          <div className="mb-6 flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-muted-foreground px-2 py-1"
              onClick={() => {
                localStorage.removeItem("pendingBooking");
                router.push(
                  serviceDetails?.slug
                    ? `/customer-services/${serviceDetails.slug}`
                    : "/customer-services"
                );
              }}
            >
              ← Back to Services
            </Button>
          </div>

          <div className=" bg-white/90 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
            <h2 className="text-3xl font-bold mb-2 text-center text-primary tracking-tight">
              Confirm Your Booking
            </h2>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Please review your details and confirm your appointment below.
            </p>

            <form
              className="space-y-6"
              onSubmit={(e) => {
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
                    Therapist
                  </label>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                    {doctorDetails ? (
                      `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}${
                        doctorDetails.specialization ? ` - ${doctorDetails.specialization}` : ""
                      }`
                    ) : booking.doctor_id ? (
                      "Loading..."
                    ) : (
                      "Not selected"
                    )}
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
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Time: {(() => {
                        // Compute end time
                        if (!booking.time || !serviceDetails?.duration_minutes) return booking.time;
                        // Convert 12h to 24h
                        const [time, ampm] = booking.time.split(' ');
                        let [h, m] = time.split(':').map(Number);
                        if (ampm === 'pm' && h !== 12) h += 12;
                        if (ampm === 'am' && h === 12) h = 0;
                        const start = new Date(2000, 0, 1, h, m);
                        const end = new Date(start.getTime() + serviceDetails.duration_minutes * 60000);
                        // Format as 12-hour time
                        let hour = end.getHours();
                        const minute = end.getMinutes().toString().padStart(2, '0');
                        const endAmpm = hour >= 12 ? 'pm' : 'am';
                        hour = hour % 12;
                        if (hour === 0) hour = 12;
                        return `${booking.time} - ${hour}:${minute} ${endAmpm}`;
                      })()}
                    </span>
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
                    <Button variant="ghost" onClick={() => router.push("/")}>
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
                        {user?.user_metadata?.first_name || ""}{" "}
                        {user?.user_metadata?.last_name || ""}
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

                  {serviceDetails && (
                    <div className="mb-2 mt-6">
                      {(() => {
                        const basePrice = Number(serviceDetails.base_price ?? 0);
                        const count = booking.session_count ?? getSessionCount(booking.package);
                        const discountRate = getDiscountRate(booking.package);

                        const unitPrice =
                          booking.unit_price !== undefined
                            ? Number(booking.unit_price)
                            : basePrice * (1 - discountRate);

                        const total = booking.total_amount ?? unitPrice * count;
                        const totalSave = basePrice * count - total;

                        return (
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200 shadow-sm">
                            <div>
                              <div className="text-2xl font-bold text-green-800">
                                {formatPrice(total)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {count} × {formatPrice(unitPrice)} per session
                              </div>
                            </div>
                            <div className="text-right mt-2 md:mt-0">
                              {discountRate > 0 ? (
                                <div className="text-sm text-green-700 font-semibold">
                                  Save {Math.round(discountRate * 100)}% — {formatPrice(totalSave)}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No discount</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Address (optional)
                      </label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter delivery address (optional)"
                        className="bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Phone
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter phone number (optional)"
                        className="bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary rounded-lg px-3 py-2"
                        type="tel"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 mt-8">
                    <Button
                      type="submit"
                      className="w-full md:w-auto px-8 py-2 text-lg text-black font-semibold rounded-lg shadow-md bg-primary hover:bg-destructive transition"
                      disabled={loading}
                    >
                      {loading ? "Confirming..." : "Confirm Booking"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full md:w-auto px-8 py-2 text-lg rounded-lg border border-gray-200"
                      onClick={() => router.push("/")}
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
    </>
  );
}