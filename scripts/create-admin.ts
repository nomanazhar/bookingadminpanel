/**
 * Script to create an admin user
 * 
 * This script can be run using:
 * npx tsx scripts/create-admin.ts
 * 
 * Or you can use the API endpoint:
 * POST /api/admin/create-admin
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createAdmin() {
  console.log('\n=== Create Admin User ===\n')

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing environment variables!')
    console.error('Please set the following in your .env.local file:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Get user input
  const email = await question('Enter admin email: ')
  const password = await question('Enter admin password (min 6 characters): ')
  const firstName = await question('Enter first name (default: Admin): ') || 'Admin'
  const lastName = await question('Enter last name (default: User): ') || 'User'

  if (!email || !password) {
    console.error('❌ Email and password are required!')
    rl.close()
    process.exit(1)
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters!')
    rl.close()
    process.exit(1)
  }

  console.log('\n⏳ Creating admin user...\n')

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if user already exists by querying profiles table
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      console.log('ℹ️  User already exists. Updating role to admin...')
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', existingProfile.id)

      if (updateError) {
        console.error('❌ Failed to update user role:', updateError.message)
        rl.close()
        process.exit(1)
      }

      console.log('\n✅ Success! User role updated to admin.')
      console.log('\n📧 Login Credentials:')
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${password}`)
      console.log('\n🔗 Login at: http://localhost:3000/signin\n')
      rl.close()
      return
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
      },
    })

    if (createError || !newUser.user) {
      console.error('❌ Failed to create user:', createError?.message || 'Unknown error')
      rl.close()
      process.exit(1)
    }

    // Update profile to admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('❌ Failed to set admin role:', profileError.message)
      // Try to clean up
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      rl.close()
      process.exit(1)
    }

    console.log('\n✅ Admin user created successfully!')
    console.log('\n📧 Login Credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Name: ${firstName} ${lastName}`)
    console.log('\n🔗 Login at: http://localhost:3000/signin\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run the script
createAdmin().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

