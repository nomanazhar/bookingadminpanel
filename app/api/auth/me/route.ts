import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ role: null })
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,email")
    .eq("id", user.id)
    .single()
  if (!profile) {
    return NextResponse.json({ role: null })
  }
  if (profile.role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("allowed_admin_pages")
      .eq("email", profile.email)
      .single()
    return NextResponse.json({ role: "doctor", allowed_admin_pages: doctor?.allowed_admin_pages || [] })
  }
  return NextResponse.json({ role: profile.role })
}
