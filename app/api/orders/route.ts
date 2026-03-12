import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithProfile } from "@/lib/supabase/auth";
import { parseBookingDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

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

    // Simple page/pageSize pagination to avoid unbounded result sets
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1;
    const pageSize = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("pageSize") || "50", 10) || 50, 1),
      100
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createClient();

    const { data: orders, error, count } = await supabase
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
      .range(from, to);

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

    return NextResponse.json({
      upcoming,
      previous,
      page,
      pageSize,
      totalCount: count || 0,
    });
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
    const { user } = await getCurrentUserWithProfile();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceId = body.service_id;
    if (!serviceId) {
      return NextResponse.json({ error: "service_id is required" }, { status: 400 });
    }

    const bookingDateRaw = body.date || body.booking_date;
    const bookingTimeRaw = body.time || body.booking_time;
    const bookingDateTime = parseBookingDateTime(bookingDateRaw, bookingTimeRaw);
    if (isNaN(bookingDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid booking date or time" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("create_customer_order_with_sessions", {
      p_service_id: serviceId,
      p_subservice_id: body.subservice_id ?? null,
      p_doctor_id: body.doctor_id ?? null,
      p_booking_date: bookingDateRaw,
      p_booking_time: bookingTimeRaw,
      p_package: body.package ?? null,
      p_sessions: body.sessions ?? null,
      p_session_count: body.session_count ?? null,
      p_unit_price: body.unit_price ?? null,
      p_discount_percent: body.discount_percent ?? null,
      p_total_amount: body.total_amount ?? null,
      p_customer_phone: body.customer_phone ?? null,
      p_address: body.address ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create order" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}