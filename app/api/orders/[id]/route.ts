import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearCachePrefix } from '@/lib/supabase/queries'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(*, category:categories(*)),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .eq('id', id)
    .maybeSingle()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  if (!data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  const supabase = await createClient()
  const { data: updatedOrder, error } = await supabase.from('orders').update({ status }).eq('id', id).select().maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: updatedOrder })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()
  try {
    console.info('[API] PUT /api/orders/%s called with payload:', id, body)
    const { data, error } = await supabase
      .from('orders')
      .update(body)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[API] Supabase update error for order %s:', id, error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      console.warn('[API] Update returned no rows for order %s; data is null', id)
      return NextResponse.json({ success: false, error: 'No rows updated', data: null }, { status: 200 })
    }

    // Invalidate server-side orders cache so admin/customer views refresh
    try {
      clearCachePrefix('orders:')
    } catch (e) {
      console.warn('[API] Failed to clear orders cache:', e)
    }

    console.info('[API] Order %s updated successfully', id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API] Unexpected error in PUT /api/orders/%s: %o', id, err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
