import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseServiceSessionOptions } from "@/lib/utils"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (body.locations && (!Array.isArray(body.locations) || body.locations.length === 0)) {
    return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
  }

  if (body.session_options !== undefined) {
    const parsedSessionOptions = parseServiceSessionOptions(body.session_options)
    const enabledOptions = parsedSessionOptions.options.filter((option) => option.enabled !== false)
    if (enabledOptions.length === 0) {
      return NextResponse.json({ error: "At least one session option is required" }, { status: 400 })
    }

    body.session_options = {
      options: enabledOptions.map((option) => ({
        label: option.label,
        sessions: option.sessions,
        discountPercent: option.discountPercent,
        enabled: true,
      })),
      times_of_day: Array.isArray(parsedSessionOptions.times_of_day)
        ? parsedSessionOptions.times_of_day
        : [],
    }
  }

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
