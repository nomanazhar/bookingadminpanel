import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  try {
    // Find services in this category
    const { data: servicesData, error: selErr } = await supabase
      .from("services")
      .select("id")
      .eq("category_id", id)

    if (selErr) {
      console.error('Error selecting services for category delete', selErr)
      return NextResponse.json({ error: selErr.message, details: { code: selErr.code, details: selErr.details, hint: selErr.hint } }, { status: 500 })
    }

    const serviceIds: string[] = Array.isArray(servicesData) ? servicesData.map((s: any) => s.id) : []

      if (serviceIds.length > 0) {
      // For orders, set service_id to null to preserve order history
      const { data: nulledOrdersData, error: ordersErr } = await supabase
        .from("orders")
        .update({ service_id: null })
        .in("service_id", serviceIds)
        .select()
      if (ordersErr) {
        console.error('Error nulling orders.service_id for services in category', ordersErr)
        return NextResponse.json({ error: ordersErr.message, details: { code: ordersErr.code, details: ordersErr.details, hint: ordersErr.hint } }, { status: 500 })
      }

      // Delete reviews linked to these services
      const { error: reviewsErr } = await supabase
        .from("reviews")
        .delete()
        .in("service_id", serviceIds)
      if (reviewsErr) {
        console.error('Error deleting reviews for services in category', reviewsErr)
        return NextResponse.json({ error: reviewsErr.message, details: { code: reviewsErr.code, details: reviewsErr.details, hint: reviewsErr.hint } }, { status: 500 })
      }

      // Delete the services themselves
      const { error: delServicesError } = await supabase
        .from("services")
        .delete()
        .in("id", serviceIds)
      if (delServicesError) {
        console.error('Error deleting services for category', delServicesError)
        return NextResponse.json({ error: delServicesError.message, details: { code: delServicesError.code, details: delServicesError.details, hint: delServicesError.hint } }, { status: 500 })
      }
    }

    // Finally delete the category
    const { error: delCategoryError } = await supabase.from("categories").delete().eq("id", id)
    if (delCategoryError) {
      console.error('Error deleting category', delCategoryError)
      return NextResponse.json({ error: delCategoryError.message, details: { code: delCategoryError.code, details: delCategoryError.details, hint: delCategoryError.hint } }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/categories/[id]', err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()
  const { data, error } = await supabase.from("categories").update(body).eq("id", id).select().single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}