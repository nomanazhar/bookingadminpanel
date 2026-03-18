"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBookingDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingBooking {
  service_id: string;
  service_name: string;
  package: string;
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM am/pm" or "HH:MM:SS"
  doctor_id?: string;
  session_count?: number;
  unit_price?: number;
  discount_percent?: number;
  total_amount?: number;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Converts any time format to "HH:MM:SS" (24-hour).
 * Handles: "10:30 am", "2:00 pm", "14:30", "14:30:00"
 */
function toTime24(displayTime: string): string {
  if (!displayTime) return "00:00:00";
  const t = displayTime.trim();

  // Already "HH:MM" or "HH:MM:SS"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
    const parts = t.split(":");
    return `${parts[0].padStart(2, "0")}:${parts[1]}:${parts[2] ?? "00"}`;
  }

  // "10:30 am" / "2:00 PM"
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}:00`;
  }

  return t; // fallback — return as-is
}

/**
 * Given a start time (any format) and duration in minutes,
 * returns the end time in "HH:MM:SS" (24-hour).
 */
function computeEndTime(startDisplay: string, durationMinutes: number): string {
  const [hStr, mStr] = toTime24(startDisplay).split(":");
  const d = new Date(2000, 0, 1, parseInt(hStr, 10), parseInt(mStr, 10));
  d.setMinutes(d.getMinutes() + durationMinutes);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

/**
 * Formats a 24-hour time string back to "H:MM am/pm" for display.
 */
function toDisplay12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m} ${ampm}`;
}

// ─── Google Calendar integration ──────────────────────────────────────────────

/**
 * Calls POST /api/bookings/create to create a Google Calendar event.
 *
 * The `order` object here is the raw row returned by the
 * create_customer_order_with_sessions RPC, which has these fields:
 *   id, service_title, customer_name, customer_email,
 *   booking_date, booking_time, booking_end_time, address, notes
 *
 * Always non-blocking — a calendar failure never affects the booking.
 * Returns the calendar event link if successful, null otherwise.
 */
async function createCalendarEventForOrder(
  order: {
    id: string;
    service_title: string;
    customer_name: string;
    customer_email: string;
    booking_date: string;       // "YYYY-MM-DD"
    booking_time: string;       // may be display format or 24h
    booking_end_time?: string;  // may be null if duration unknown
    address?: string;
    notes?: string;
  },
  doctorEmail: string | undefined,
  durationMinutes: number | undefined
): Promise<string | null> {
  try {
    // Convert start time to 24h
    const startTime24 = toTime24(order.booking_time);

    // Compute end time: prefer booking_end_time from DB, fallback to duration calc
    const endTime24 = order.booking_end_time
      ? toTime24(order.booking_end_time)
      : durationMinutes
        ? computeEndTime(order.booking_time, durationMinutes)
        : undefined;

    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId:        order.id,
        serviceTitle:   order.service_title,
        customerName:   order.customer_name,
        customerEmail:  order.customer_email,
        doctorEmail:    doctorEmail   ?? undefined,
        bookingDate:    order.booking_date,
        bookingTime:    startTime24,
        bookingEndTime: endTime24,
        location:       order.address ?? undefined,
        notes:          order.notes   ?? undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[calendar] event creation failed:", err);
      return null;
    }

    const { eventLink } = await res.json();
    return eventLink ?? null;
  } catch (e) {
    console.error("[calendar] API call failed:", e);
    return null;
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ConfirmBookingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [booking, setBooking]               = useState<PendingBooking | null>(null);
  const [user, setUser]                     = useState<any>(null);
  const [profile, setProfile]               = useState<any>(null);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [doctorDetails, setDoctorDetails]   = useState<any>(null);
  const [needsAuth, setNeedsAuth]           = useState(false);
  const [address, setAddress]               = useState("");
  const [phone, setPhone]                   = useState("");
  const [loading, setLoading]               = useState(false);

  // ── Load pending booking + auth user + profile ───────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("pendingBooking");
    if (raw) {
      try { setBooking(JSON.parse(raw)); }
      catch { console.error("Failed to parse pendingBooking"); }
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) { setNeedsAuth(true); return; }
      setUser(data.user);
      try {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("id", data.user.id).single();
        if (prof) setProfile(prof);
      } catch {}
    });
  }, []);

  // ── Load service details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!booking?.service_id) return;
    (async () => {
      try {
        const { data } = await createClient()
          .from("services").select("*").eq("id", booking.service_id).single();
        if (data) setServiceDetails(data);
      } catch {}
    })();
  }, [booking?.service_id]);

  // ── Load doctor details ───────────────────────────────────────────────────
  useEffect(() => {
    if (!booking?.doctor_id) return;
    (async () => {
      try {
        const { data } = await createClient()
          .from("doctors").select("*").eq("id", booking.doctor_id).single();
        if (data) setDoctorDetails(data);
      } catch {}
    })();
  }, [booking?.doctor_id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getSessionCount = (label: string): number => {
    const match = String(label).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const getDiscountRate = (label: string): number => {
    const count = getSessionCount(label);
    if (count === 3)  return 0.25;
    if (count === 6)  return 0.35;
    if (count === 10) return 0.45;
    return 0;
  };

  const formatPrice = (v: number) => `£${v.toFixed(2)}`;

  // ── handleConfirm — order creation + calendar event ───────────────────────
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
      const basePrice    = Number(serviceDetails?.base_price ?? 0);
      const sessionCount = booking.session_count ?? getSessionCount(booking.package);
      const discountRate = getDiscountRate(booking.package);
      const unitPrice    = Math.round(basePrice * (1 - discountRate) * 100) / 100;
      const totalAmount  = Math.round(unitPrice * sessionCount * 100) / 100;

      // ── Step 1: Create order in DB via /api/orders ───────────────────────
      // /api/orders POST calls create_customer_order_with_sessions RPC and
      // returns the full order row as JSON with status 201.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id:       booking.service_id,
          service_title:    booking.service_name,
          package:          booking.package,
          date:             booking.date,       // RPC receives as p_booking_date
          time:             booking.time,       // RPC receives as p_booking_time
          doctor_id:        booking.doctor_id,
          address:          address || null,
          phone:            phone   || null,
          notes:            null,
          unit_price:       unitPrice,
          session_count:    sessionCount,
          discount_percent: Math.round(discountRate * 100),
          total_amount:     totalAmount,
        }),
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

      // order is the full row returned by the RPC:
      // { id, service_title, customer_name, customer_email,
      //   booking_date, booking_time, booking_end_time, address, notes, ... }
      const order = await res.json();

      // ── Step 2: Create Google Calendar event (non-blocking) ──────────────
      // Runs AFTER the order is confirmed in DB.
      // If this fails for any reason the booking is still valid.
      const calendarEventLink = await createCalendarEventForOrder(
        order,
        doctorDetails?.email,            // sends invite to therapist
        serviceDetails?.duration_minutes // used to compute end time if not in order
      );

      // ── Step 3: Show result to user ──────────────────────────────────────
      toast({
        title: "Booking Confirmed! 🎉",
        description: calendarEventLink
          ? "Your appointment is booked and added to Google Calendar. Check your email for the invite."
          : "Your appointment has been successfully created.",
      });

      // Open the calendar event link in a new tab if available
      // if (calendarEventLink) {
      //   window.open(calendarEventLink, "_blank", "noopener,noreferrer");
      // }

      localStorage.removeItem("pendingBooking");
      router.push("/book-consultation");

    } catch (err) {
      console.error("[confirm-booking] unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── handleCancel ─────────────────────────────────────────────────────────
  // Step 10: only clears localStorage — there's no DB order yet at this point
  // (user is cancelling before confirming). If you need to cancel an already-
  // confirmed order (from the bookings list page), call DELETE /api/orders/[id]
  // there and delete the calendar event using the google_calendar_event_id column.
  const handleCancel = () => {
    localStorage.removeItem("pendingBooking");
    router.push("/");
  };

  // ── Empty state ───────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] flex flex-col items-center py-10 px-2">
      <div className="w-full max-w-2xl">

        {/* Back button */}
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

        <div className="bg-white/90 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
          <h2 className="text-3xl font-bold mb-2 text-center text-primary tracking-tight">
            Confirm Your Booking
          </h2>
          <p className="text-center text-gray-500 mb-8 text-sm">
            Please review your details and confirm your appointment below.
          </p>

          <form
            className="space-y-6"
            onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}
          >
            {/* Booking summary grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Service</label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {booking.service_name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Package</label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {booking.package}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Therapist</label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {doctorDetails
                    ? `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}${doctorDetails.specialization ? ` — ${doctorDetails.specialization}` : ""}`
                    : booking.doctor_id ? "Loading..." : "Not selected"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Date & Time</label>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                  {(() => {
                    try {
                      return parseBookingDateTime(booking.date, "00:00:00").toLocaleDateString(
                        undefined,
                        { weekday: "long", month: "short", day: "numeric", year: "numeric" }
                      );
                    } catch { return booking.date; }
                  })()}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {booking.time}
                    {serviceDetails?.duration_minutes
                      ? ` — ${toDisplay12h(computeEndTime(booking.time, serviceDetails.duration_minutes))}`
                      : ""}
                  </span>
                </div>
              </div>

            </div>

            {/* Auth guard */}
            {needsAuth && !user ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
                <p className="mb-4 text-yellow-900 font-medium">
                  Please sign in to confirm your pending booking.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/signin")}>Sign In</Button>
                  <Button variant="ghost" onClick={() => router.push("/")}>Back to Dashboard</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Customer info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                      {profile?.first_name || user?.user_metadata?.first_name || ""}{" "}
                      {profile?.last_name  || user?.user_metadata?.last_name  || ""}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 text-gray-800">
                      {profile?.email || user?.email || ""}
                    </div>
                  </div>
                </div>

                {/* Pricing summary */}
                {serviceDetails && (() => {
                  const basePrice    = Number(serviceDetails.base_price ?? 0);
                  const count        = booking.session_count ?? getSessionCount(booking.package);
                  const discountRate = getDiscountRate(booking.package);
                  const unitPrice    = booking.unit_price !== undefined
                    ? Number(booking.unit_price)
                    : basePrice * (1 - discountRate);
                  const total     = booking.total_amount ?? unitPrice * count;
                  const totalSave = basePrice * count - total;

                  return (
                    <div className="mt-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200 shadow-sm">
                        <div>
                          <div className="text-2xl font-bold text-green-800">{formatPrice(total)}</div>
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
                    </div>
                  );
                })()}

                {/* Optional fields */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Address <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address (optional)"
                      className="bg-gray-50 border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Phone <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number (optional)"
                      className="bg-gray-50 border-gray-200 rounded-lg"
                      type="tel"
                    />
                  </div>
                </div>

                {/* Actions */}
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
                    onClick={handleCancel}
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