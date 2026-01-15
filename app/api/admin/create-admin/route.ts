import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route to create an admin user
 * 
 * This route uses the Supabase Service Role Key to create an admin user
 * directly in the database, bypassing RLS policies.
 * 
 * SECURITY: This should only be used during initial setup.
 * Consider adding additional security (e.g., secret token) for production.
 * 
 * Usage:
 * POST /api/admin/create-admin
 * Body: {
 *   email: "admin@example.com",
 *   password: "secure-password",
 *   firstName: "Admin",
 *   lastName: "User"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase configuration',
          details: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file',
          check: {
            hasUrl: !!supabaseUrl,
            hasKey: !!serviceRoleKey,
          },
        },
        { status: 500 }
      )
    }
    
    // Validate URL format
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Supabase URL format',
          details: 'URL must start with http:// or https://',
          received: supabaseUrl.substring(0, 50) + '...',
        },
        { status: 500 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          details: jsonError.message || 'Could not parse request body',
          hint: 'Make sure you are sending valid JSON with Content-Type: application/json header',
        },
        { status: 400 }
      )
    }
    
    const { email, password, firstName = 'Admin', lastName = 'User' } = body

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (...args) => fetch(...args),
      },
    })

    // Test connection by checking if profiles table is accessible
    const { data: testData, error: testError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError && testError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Supabase database',
          details: testError.message,
          code: testError.code,
          hint: 'Please verify your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct',
        },
        { status: 500 }
      )
    }

    // Check if user already exists by querying profiles table
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      // User exists, update their profile to admin
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', existingProfile.id)

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            error: `User exists but failed to update role: ${updateError.message}`,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'User already exists. Role updated to admin.',
        data: {
          email: existingProfile.email,
          id: existingProfile.id,
          role: 'admin',
        },
      })
    }

    // Create new user
    let newUser, createError
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
        },
      })
      newUser = result.data
      createError = result.error
    } catch (err: any) {
      console.error('Error in auth.admin.createUser:', err)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to Supabase: ${err.message || 'Network error'}`,
          details: 'Please check your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
          hint: 'Make sure your dev server is running and environment variables are loaded correctly',
        },
        { status: 500 }
      )
    }

    if (createError || !newUser?.user) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create user: ${createError?.message || 'Unknown error'}`,
          details: createError?.message || 'User creation failed',
          hint: 'Check that your SUPABASE_SERVICE_ROLE_KEY is correct and has admin permissions',
        },
        { status: 500 }
      )
    }

    // Update profile to admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', newUser.user.id)

    if (profileError) {
      // User created but profile update failed - try to delete user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        {
          success: false,
          error: `User created but failed to set admin role: ${profileError.message}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully!',
      data: {
        email: newUser.user.email,
        id: newUser.user.id,
        role: 'admin',
        firstName,
        lastName,
      },
      credentials: {
        email,
        password: '*** (use the password you provided)',
      },
    })
  } catch (error: any) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

