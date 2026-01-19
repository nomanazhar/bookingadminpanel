import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get all subservices for a service
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId")
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subservices")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Create subservices (bulk or single)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
  // Accepts array or single object
  const payload = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase
    .from("subservices")
    .insert(payload)
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
