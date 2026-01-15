import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByCustomer } from '@/lib/supabase/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json({ error: 'Missing customer id' }, { status: 400 });
    }
    const orders = await getOrdersByCustomer(customerId);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
