import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("services")
    .select(`
      *,
      category:categories(*),
      subservices:subservices(*)
    `)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { locations } = body
  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase.from("services").insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
