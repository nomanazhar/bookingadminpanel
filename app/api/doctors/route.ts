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
        { error: "Doctors table does not exist. Please run the database migration first." },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message || "Unknown error occurred." }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, phone, specialization, bio, avatar_url, is_active, locations, password } = body
    
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      )
    }
    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: "At least one location is required" }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
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
    
    // Check for existing doctor with same email
    const { data: existingDoctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingDoctor) {
      return NextResponse.json({ error: "A doctor with this email already exists." }, { status: 400 });
    }

    // Insert doctor record
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
      // ...existing code...
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: "Doctors table does not exist. Please run the database migration first." },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message || "Unknown error occurred." }, { status: 500 })
    }

    // --- Create user in Supabase Auth with doctor role if not exists ---
    // Use service role client for admin actions
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRoleClient")
    const serviceClient = createServiceRoleClient()
    // Check if user already exists
    const { data: existingUser } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    let userId = null;
    if (!existingUser) {
      // Create doctor user with password
      const { data: createdUser, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          phone
        }
      })
      if (createError) {
        // Optionally: Rollback doctor insert if user creation fails
        return NextResponse.json({ error: "Doctor created but failed to create user: " + createError.message }, { status: 500 })
      }
      userId = createdUser?.user?.id || null;
    } else {
      // If user already exists, get their id
      const { data: profileUser } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      userId = profileUser?.id || null;
    }

    // Wait for the profile row to exist before updating role to 'doctor'
    if (userId) {
      let updated = false;
      for (let i = 0; i < 2; i++) { // Try up to 5 times
        // Check if profile row exists
        const { data: profileRow } = await serviceClient
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (profileRow) {
          const { error: updateError } = await serviceClient.from("profiles").update({
            email,
            first_name,
            last_name,
            phone: phone || null,
            role: "doctor",
          }).eq("id", userId);
          if (!updateError) {
            updated = true;
            break;
          }
        }
        // Wait 200ms before retrying
        await new Promise(res => setTimeout(res, 200));
      }
      if (!updated) {
        return NextResponse.json({ error: "Failed to update doctor role in profile" }, { status: 500 });
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

