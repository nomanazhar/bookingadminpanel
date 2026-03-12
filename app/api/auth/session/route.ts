import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  // Call updateSession to set ds_role cookie
  await updateSession(request);
  return NextResponse.json({ success: true });
}
