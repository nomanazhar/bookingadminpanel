import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, slug, image_url, locations, display_order = 0, is_active = true } = body
  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
  }
  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .insert([
      {
        name,
        description,
        slug,
        image_url,
        locations,
        display_order:0,
        is_active:true,
      },
    ])
    .select()
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
