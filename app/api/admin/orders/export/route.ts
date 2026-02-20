import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Export all bookings as JSON (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    // Check admin
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
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
