import { NextResponse } from 'next/server'

export async function POST() {
  // Server-side in-memory cache has been removed; nothing to clear here.
  return NextResponse.json({ ok: true })
}
