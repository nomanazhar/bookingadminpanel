import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to signin page
  const res = NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  // clear short-lived role cookie immediately to avoid redirect loops
  try {
    res.cookies.set('ds_role', '', { path: '/', maxAge: 0 })
  } catch (e) {}
  return res
}

export async function POST() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to signin page
  const res = NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  try {
    res.cookies.set('ds_role', '', { path: '/', maxAge: 0 })
  } catch (e) {}
  return res
}

