import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.status === 401 ? "Unauthorized" : "Forbidden: Admin access required" },
        { status: admin.status }
      )
    }
    const supabase = admin.supabase
    
    const { data, error } = await supabase
      .from("doctors")
      .update(body)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.status === 401 ? "Unauthorized" : "Forbidden: Admin access required" },
        { status: admin.status }
      )
    }
    const supabase = admin.supabase
    
    const { error } = await supabase
      .from("doctors")
      .delete()
      .eq("id", id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

