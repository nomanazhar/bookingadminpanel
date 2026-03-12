import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";

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
    // Pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10) || 50;
    // Get paginated data
    const { data, error, count } = await supabase
      .from('legacy_orders')
      .select('*', { count: 'exact' })
      .order('booking_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], totalCount: count || 0 }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
