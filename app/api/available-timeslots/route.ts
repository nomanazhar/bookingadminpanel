import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper to convert 12h time (e.g., "10:15 am") to minutes since midnight
function timeToMinutes(time12h: string) {
  const [time, ampm] = time12h.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h * 60 + m;
}

// Check if two time intervals overlap
function isOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date");
  const doctorId = searchParams.get("doctorId");
  const serviceId = searchParams.get("serviceId");

  if (!date || !doctorId || !serviceId) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get service duration
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .maybeSingle();
  if (serviceError || !service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  const duration = Number(service.duration_minutes) || 50;

  // Get all bookings for this doctor and date
  const { data: bookings, error: bookingsError } = await supabase
    .from("orders")
    .select("booking_time")
    .eq("doctor_id", doctorId)
    .eq("booking_date", date);
  if (bookingsError) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  // Build list of reserved intervals
  const reserved: Array<{ start: number; end: number }> = bookings.map((b: any) => {
    const start = timeToMinutes(b.booking_time);
    return { start, end: start + duration };
  });

  // Generate all possible slots (e.g., every 15 min from 9:00am to 6:00pm)
  const slots: string[] = [];
  for (let min = 9 * 60; min <= 18 * 60 - duration; min += 15) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    let hour = h % 12;
    if (hour === 0) hour = 12;
    const ampm = h < 12 ? "am" : "pm";
    const label = `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
    slots.push(label);
  }

  // Filter out slots that overlap with reserved intervals
  const availableSlots = slots.filter((slot) => {
    const start = timeToMinutes(slot);
    const end = start + duration;
    return !reserved.some((r) => isOverlap(start, end, r.start, r.end));
  });

  return NextResponse.json({ slots: availableSlots });
}
