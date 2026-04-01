import { NextResponse } from 'next/server'
import { getUsersPaginatedAdmin } from '@/lib/supabase/queries'
import { createServiceRoleClient } from '@/lib/supabase/serviceRoleClient'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1
    const size = parseInt(url.searchParams.get('size') || '20', 10) || 20
    const q = url.searchParams.get('q') || null

    // Use service role for admin fetch
    const { data, count } = await getUsersPaginatedAdmin(page, size, q)

    return NextResponse.json({ data, count })
  } catch (err: any) {
    console.error('/api/admin/users GET error:', {
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json({ error: err.message || 'Unknown' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, first_name, last_name, phone, gender, address, role } = body

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, first_name, last_name' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null,
        role: role || 'customer',
      },
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    if (!authData?.user?.id) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create profile record with upsert to handle duplicates
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        phone: phone || null,
        gender: gender || null,
        address: address || null,
        role: role || 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { data: profileData, message: 'Customer created successfully' },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('/api/admin/users POST error:', {
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
