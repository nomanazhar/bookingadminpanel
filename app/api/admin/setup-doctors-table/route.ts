import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * API Route to check if the doctors table exists and provide setup instructions
 * 
 * Since Supabase JS client cannot execute DDL statements, this endpoint
 * checks if the table exists and provides clear instructions if it doesn't.
 * 
 * Usage:
 * GET /api/admin/setup-doctors-table - Check table status
 */

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase configuration.',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Try to query the doctors table
    const { data, error } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .limit(1)

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist
      return NextResponse.json({
        success: false,
        tableExists: false,
        message: 'Doctors table does not exist. Please run the SQL migration.',
        instructions: {
          step1: 'Open your Supabase Dashboard',
          step2: 'Go to SQL Editor',
          step3: 'Run the SQL from doctors_table.sql file or SUPABASE_CONSOLIDATED.sql',
          sqlFile: 'doctors_table.sql or SUPABASE_CONSOLIDATED.sql (doctors section)',
        },
      })
    }

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
      })
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      message: 'Doctors table exists and is ready to use.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({
      success: false,
      error: message,
    })
  }
}

