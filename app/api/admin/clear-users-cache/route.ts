import { NextResponse } from 'next/server'
import { clearCachePrefix } from '@/lib/supabase/queries'

export async function POST() {
  try {
    clearCachePrefix('users:')
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown' }, { status: 500 })
  }
}
