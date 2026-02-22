// app/api/orders/[id]/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRoleClient';
import type { Session } from '@/types/database';

// GET - Fetch all sessions for an order
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('order_id', id)
    .order('session_number', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST - Bulk create sessions for an order
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceRoleClient();
  const body = await req.json();
  const { sessions } = body;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: 'No sessions provided' }, { status: 400 });
  }
  // Attach order_id to each session record
  const records = sessions.map((session: Partial<Session>) => ({
    ...session,
    order_id: id,
  }));
  const { data, error } = await supabase
    .from('sessions')
    .insert(records)
    .select('*');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// PATCH - Update a single session (pass sessionId in body)
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceRoleClient();
  const body = await req.json();
  const { sessionId, ...updateFields } = body;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  // Only allow updates to whitelisted session fields
  const allowedFields = [
    'scheduled_date',
    'scheduled_time',
    'status',
    'attended_date',
    'notes',
    'expires_at',
  ];
  const safeUpdate: Partial<Session> = {};
  for (const key of allowedFields) {
    if (key in updateFields) {
      (safeUpdate as Record<string, unknown>)[key] = updateFields[key];
    }
  }
  if (Object.keys(safeUpdate).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('sessions')
    .update(safeUpdate)
    .eq('id', sessionId)
    .eq('order_id', id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
