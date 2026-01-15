import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()
  console.info('PUT /api/services/[id] called', { id })
  try {
    const { data, error } = await supabase.from("services").update(body).eq("id", id).select().single()
    if (error) {
      console.error('Supabase error updating service', { id, body, error })
      return NextResponse.json({ error: error.message, details: { code: error.code, details: error.details, hint: error.hint } }, { status: 500 })
    }
    console.info('Service updated', { id })
    return NextResponse.json(data)
  } catch (err) {
    console.error('Unexpected error in PUT /api/services/[id]', { id, err })
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  try {
    console.info('DELETE /api/services/[id] called', { id })
    // Preserve orders history by nulling service reference
    const { data: nulledOrdersData, error: ordersErr } = await supabase
      .from("orders")
      .update({ service_id: null })
      .eq("service_id", id)
      .select()
    if (ordersErr) {
      console.error('Error nulling orders.service_id before deleting service', { id, ordersErr })
      return NextResponse.json({ error: ordersErr.message, details: { code: ordersErr.code, details: ordersErr.details, hint: ordersErr.hint } }, { status: 500 })
    }

    // Delete reviews for this service
    const { error: reviewsErr } = await supabase.from("reviews").delete().eq("service_id", id)
    if (reviewsErr) {
      console.error('Error deleting reviews for service', { id, reviewsErr })
      return NextResponse.json({ error: reviewsErr.message, details: { code: reviewsErr.code, details: reviewsErr.details, hint: reviewsErr.hint } }, { status: 500 })
    }

    const { error } = await supabase.from("services").delete().eq("id", id)
    if (error) {
      console.error('Error deleting service', { id, error })
      return NextResponse.json({ error: error.message, details: { code: error.code, details: error.details, hint: error.hint } }, { status: 500 })
    }

    console.info('Service deleted', { id })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/services/[id]', { id, err })
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
