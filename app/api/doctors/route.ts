import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    // Check if the error is because the table doesn't exist
    if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: "Doctors table does not exist. Please run the database migration first.",
          details: "The 'public.doctors' table needs to be created in your Supabase database.",
          instructions: {
            step1: "Ask someone with Supabase dashboard access to run the SQL migration",
            step2: "SQL file location: doctors_table.sql or see the doctors section in SUPABASE_CONSOLIDATED.sql",
            step3: "Alternative: Contact your database administrator to execute the SQL migration",
            sqlFile: "doctors_table.sql",
          }
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, phone, specialization, bio, avatar_url, is_active, locations } = body
    
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      )
    }
    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
    
    const { data, error } = await supabase
      .from("doctors")
      .insert([
        {
          first_name,
          last_name,
          email,
          phone: phone || null,
          specialization: specialization || null,
          bio: bio || null,
          avatar_url: avatar_url || null,
          is_active: is_active !== undefined ? is_active : true,
          locations,
        },
      ])
      .select()
      .single()
    
    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: "Doctors table does not exist. Please run the database migration first.",
            details: "The 'public.doctors' table needs to be created in your Supabase database.",
            instructions: {
              step1: "Ask someone with Supabase dashboard access to run the SQL migration",
              step2: "SQL file location: doctors_table.sql or see the doctors section in SUPABASE_CONSOLIDATED.sql",
              step3: "Alternative: Contact your database administrator to execute the SQL migration",
              sqlFile: "doctors_table.sql",
            }
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

