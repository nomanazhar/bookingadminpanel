import { NextResponse } from 'next/server';

export async function POST() {
  // The old in-memory server cache has been removed; nothing to clear here.
  return NextResponse.json({ success: true });
}
