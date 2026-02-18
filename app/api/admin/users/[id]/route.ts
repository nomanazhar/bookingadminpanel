import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get single user (profile) by id (admin view)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`/api/admin/users/${id} GET supabase error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    console.warn(`/api/admin/users/${id} GET: user not found`)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// Update user profile by id (admin)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const allowedFields = [
    'email',
    'first_name',
    'last_name',
    'phone',
    'gender',
    'address',
    'role',
  ] as const

  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error(`/api/admin/users/${id} PUT supabase error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

// Delete user profile by id (admin) – note: guard delete button in UI for admins
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) {
    console.error(`/api/admin/users/${id} DELETE supabase error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
