import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserWithProfile } from "@/lib/supabase/auth"

export async function GET(req: NextRequest) {
  const { user, profile, supabase } = await getCurrentUserWithProfile()
  if (!user) {
    return NextResponse.json({ role: null })
  }
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
