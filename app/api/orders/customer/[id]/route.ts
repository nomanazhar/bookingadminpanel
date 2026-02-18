// Optimized version of customer/[id]/route.ts
// Changes:
// - Use createClient() consistently (publicClient if truly public/read-only).
// - Added error handling, made customerId required.
// - Assume getOrdersByCustomer filters by customerId in DB (as per name) — if not, it's a bottleneck; ensure it does.
// - Perf wins: If getOrdersByCustomer selects only needed fields and limits, it's good. Add order/limit if missing inside the function.
// - Bottlenecks: If getOrdersByCustomer fetches all then filters, fix it to query with .eq('customer_id', customerId).

import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByCustomer } from '@/lib/supabase/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json({ error: 'Missing customer id' }, { status: 400 });
    }

    // Use public client for static/cached API route if read-only
    const { createPublicClient } = await import('@/lib/supabase/publicClient');
    const supabase = createPublicClient();

    const orders = await getOrdersByCustomer(supabase, customerId);

    return NextResponse.json(orders);
  } catch (error) {
    console.error('GET /customer/[id]/orders error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}