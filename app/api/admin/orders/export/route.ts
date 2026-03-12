import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Export all bookings as JSON (admin only)
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
    // Export type: orders, legacy, both
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "orders";
    let data: any[] = [];
    if (type === "orders") {
      const { data: orders, error } = await supabase.from('orders').select('*');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      data = orders || [];
    } else if (type === "legacy") {
      const { data: legacy, error } = await supabase.from('legacy_orders').select('*');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      data = legacy || [];
    } else if (type === "both") {
      const { data: orders, error: err1 } = await supabase.from('orders').select('*');
      const { data: legacy, error: err2 } = await supabase.from('legacy_orders').select('*');
      if (err1) return NextResponse.json({ error: err1.message }, { status: 500 });
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
      data = [...(orders || []), ...(legacy || [])];
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
