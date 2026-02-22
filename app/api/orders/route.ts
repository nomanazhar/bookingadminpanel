import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBookingDateTime } from "@/lib/utils";

// Helper to build ISO datetime string
function buildISODateTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        booking_date,
        booking_time,
        service_id,
        service_title,
        customer_id,
        total_amount,
        unit_price,
        session_count,
        discount_percent,
        notes,
        created_at
      `)
      .eq("customer_id", customerId)
      .order("booking_date", { ascending: false })
      .limit(200);

    if (error) throw error;

    const now = new Date();
    const upcoming: typeof orders = [];
    const previous: typeof orders = [];

    for (const order of orders) {
      const bookingDateTime = parseBookingDateTime(
        order.booking_date,
        order.booking_time || "00:00:00"
      );
      const isActive = order.status === "pending" || order.status === "confirmed";

      if (isActive && bookingDateTime >= now) {
        upcoming.push(order);
      } else {
        previous.push(order);
      }
    }

    // Sort upcoming ascending, previous descending
    upcoming.sort((a, b) =>
      parseBookingDateTime(a.booking_date, a.booking_time || "00:00:00").getTime() -
      parseBookingDateTime(b.booking_date, b.booking_time || "00:00:00").getTime()
    );

    previous.sort((a, b) =>
      parseBookingDateTime(b.booking_date, b.booking_time || "00:00:00").getTime() -
      parseBookingDateTime(a.booking_date, a.booking_time || "00:00:00").getTime()
    );

    return NextResponse.json({ upcoming, previous });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    const serviceId = body.service_id;
    if (!serviceId) {
      return NextResponse.json({ error: "service_id is required" }, { status: 400 });
    }

    const { data: service } = await supabase
      .from("services")
      .select("base_price, duration_minutes")
      .eq("id", serviceId)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Session count
    let sessionCount = Math.max(
      1,
      Math.min(
        10,
        Number(
          body.sessions ??
            body.session_count ??
            (typeof body.package === "number" ? body.package : 1)
        ) || 1
      )
    );

    const basePrice = Number(service.base_price ?? 0);

    // Discount
    let discountPercent = Number(body.discount_percent ?? 0);
    if (!body.discount_percent && sessionCount > 1) {
      if (sessionCount === 3) discountPercent = 25;
      else if (sessionCount === 6) discountPercent = 35;
      else if (sessionCount === 10) discountPercent = 45;
    }

    const unitPrice =
      body.unit_price !== undefined
        ? Number(body.unit_price)
        : Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;

    const totalAmount =
      body.total_amount !== undefined
        ? Number(body.total_amount)
        : unitPrice * sessionCount;


    // Use parseBookingDateTime to validate and extract date/time
    const bookingDateTime = parseBookingDateTime(body.date || body.booking_date, body.time || body.booking_time);
    if (isNaN(bookingDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid booking date or time" },
        { status: 400 }
      );
    }
    // Format date and time for DB
    const bookingDate = bookingDateTime.toISOString().slice(0, 10); // YYYY-MM-DD
    const bookingTime = bookingDateTime.toTimeString().slice(0, 8); // HH:MM:SS

    // Calculate end time
    let booking_end_time: string | null = null;
    if (service.duration_minutes) {
      const start = new Date(buildISODateTime(bookingDate, bookingTime));
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + service.duration_minutes * 60_000);
        booking_end_time = end.toTimeString().slice(0, 8); // HH:mm:ss
      }
    }

    const insertObj = {
      customer_id: user.id,
      service_id: serviceId,
      subservice_id: body.subservice_id ?? null,
      doctor_id: body.doctor_id ?? null,
      service_title: body.service_title || body.service_name || "",
      customer_name: profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : "",
      customer_email: profile?.email || user.email || "",
      customer_phone: body.customer_phone ?? null,
      address: body.address ?? null,
      session_count: sessionCount,
      unit_price: unitPrice,
      discount_percent: Math.round(discountPercent),
      total_amount: totalAmount,
      booking_date: bookingDate,
      booking_time: bookingTime,
      booking_end_time,
      notes: body.notes ?? null,
    };

    const { data: inserted, error } = await supabase
      .from("orders")
      .insert(insertObj)
      .select()
      .single();

    if (error) throw error;

    // Create sessions for this order
    if (inserted && inserted.id && sessionCount > 0) {
      // First session is scheduled, rest are pending
      const sessions = [];
      for (let i = 1; i <= sessionCount; i++) {
        sessions.push({
          order_id: inserted.id,
          session_number: i,
          status: i === 1 ? 'scheduled' : 'pending',
          scheduled_date: i === 1 ? bookingDate : null,
          scheduled_time: i === 1 ? bookingTime : null,
          expires_at: null,
        });
      }
      // Insert all sessions
      await supabase.from('sessions').insert(sessions);
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}