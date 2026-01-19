import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Update or delete a subservice by id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subservices")
    .update(body)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // Only allow delete if not referenced in orders (future-proof)
  // (Assume orders table has subservice_id column if needed)
  // For now, just delete
  const { error } = await supabase.from("subservices").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
