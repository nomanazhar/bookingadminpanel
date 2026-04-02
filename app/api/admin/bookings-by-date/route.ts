import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * GET /api/admin/bookings-by-date?date=YYYY-MM-DD&doctors=id1,id2&limit=200
 * Returns a compact list of bookings for the given date (small payload)
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.status === 401 ? "Unauthorized" : "Forbidden: Admin access required" },
        { status: admin.status }
      );
    }

    const supabase = admin.supabase;
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "Missing required 'date' query param (YYYY-MM-DD)" }, { status: 400 });
    }

    const doctorsParam = url.searchParams.get("doctors");
    const limit = parseInt(url.searchParams.get("limit") || "500", 10) || 500;

    // Fields to return (compact)
    const selectFields = `id, booking_date, booking_time, booking_end_time, doctor_id, customer_name, service_title, status, service_id, service_ids`;

    // Build base query for orders
    let query = supabase
      .from("orders")
      .select(selectFields)
      .eq("booking_date", date)
      .order("booking_time", { ascending: true })
      .limit(limit);

    if (doctorsParam) {
      const ids = doctorsParam.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) query = query.in("doctor_id", ids as string[]);
    }

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to fetch bookings" }, { status: 500 });
    }

    // Keep payload minimal — only from `orders` table for performance
    const compact = (orders || []).map((o: any) => ({
      id: o.id,
      booking_date: o.booking_date,
      booking_time: o.booking_time?.slice(0,5) || null,
      booking_end_time: o.booking_end_time?.slice(0,5) || null,
      doctor_id: o.doctor_id || null,
      customer_name: o.customer_name || null,
      service_title: o.service_title || null,
      status: o.status || null,
      service_id: o.service_id || null,
      service_ids: o.service_ids || null,
    }));

    return NextResponse.json({ bookings: compact }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
