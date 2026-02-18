import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearCachePrefix } from '@/lib/supabase/queries';

// Single order operations: GET, PATCH, PUT, DELETE

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    // Set status to 'cancelled' instead of deleting
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // Optionally clear cache
    await clearCachePrefix('orders:');

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('DELETE /orders/[id] error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *, 
        service:services(*, category:categories(*)),
        customer:profiles(*),
        doctor:doctors(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /orders/[id] error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // Optionally clear cache
    await clearCachePrefix('orders:');

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('PATCH /orders/[id] error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    console.info('[API] PUT /api/orders/%s called with payload:', id, body);

    const { data, error } = await supabase
      .from('orders')
      .update(body)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API] Supabase update error for order %s:', id, error);
      throw error;
    }

    if (!data) {
      console.warn('[API] Update returned no rows for order %s; data is null', id);
      return NextResponse.json({ success: false, error: 'No rows updated', data: null }, { status: 200 });
    }

    // Invalidate server-side orders cache
    try {
      await clearCachePrefix('orders:');
    } catch (e) {
      console.warn('[API] Failed to clear orders cache:', e);
    }

    console.info('[API] Order %s updated successfully', id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    // id is not available here, so do not reference it
    console.error('[API] Unexpected error in PUT /api/orders: %o', err);
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}