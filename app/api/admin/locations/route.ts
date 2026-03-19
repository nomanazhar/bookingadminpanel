import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all active locations
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("GET /api/admin/locations error:", error)
    return NextResponse.json(
      { message: "Failed to fetch locations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Not authenticated" },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized: Admin access required" },
        { status: 403 }
      )
    }

    // Validate and parse request
    const body = await request.json()
    const { name, address, city, country } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Location name is required" },
        { status: 400 }
      )
    }

    // Insert new location
    const { data, error } = await supabase
      .from("locations")
      .insert([
        {
          name: name.trim(),
          address: address || null,
          city: city || null,
          country: country || "UK",
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { message: "Location with this name already exists" },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/locations error:", error)
    return NextResponse.json(
      { message: "Failed to create location" },
      { status: 500 }
    )
  }
}
