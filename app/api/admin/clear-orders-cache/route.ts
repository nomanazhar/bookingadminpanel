import { NextResponse } from 'next/server';
import { clearCachePrefix } from '@/lib/supabase/queries';

export async function POST() {
  try {
    clearCachePrefix('orders:');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
