import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseServiceSessionOptions } from "@/lib/utils"

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
  // Ensure locations is always an array and data is always an array
  const safeData = Array.isArray(data)
    ? data.map((svc: any) => ({
        ...svc,
        locations: Array.isArray(svc.locations) ? svc.locations : [],
      }))
    : [];
  return NextResponse.json(safeData)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { locations } = body
  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
  }

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

  const supabase = await createClient()
  const { data, error } = await supabase.from("services").insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
