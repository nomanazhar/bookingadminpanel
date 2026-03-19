import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const locationId = id

    // Soft delete: set is_active to false
    const { data, error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", locationId)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          { message: "Location not found" },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { message: "Location deleted successfully", data }
    )
  } catch (error) {
    console.error("DELETE /api/admin/locations/[id] error:", error)
    return NextResponse.json(
      { message: "Failed to delete location" },
      { status: 500 }
    )
  }
}
