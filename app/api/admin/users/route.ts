import { NextResponse } from 'next/server'
import { getUsersPaginatedAdmin } from '@/lib/supabase/queries'

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
