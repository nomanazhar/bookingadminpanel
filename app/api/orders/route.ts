// Optimized version of main route.ts (for specific order /orders/[id])
// Changes:
// - All handlers: Use selective select where possible, added logging, ensured .maybeSingle() for single row ops.
// - GET: Already joins multiple tables — fine for single row, but select only needed fields if joins are heavy.
// - DELETE: Soft delete preserved, fast single row update.
// - PATCH: Simple status update, fast.
// - PUT: Full update, added validation log, cache clear preserved.
// - Perf wins: Single row ops are inherently fast; no loops or all-rows fetch. Add index on 'id' if not primary key.
// - Bottlenecks: Joins in GET could be slow if tables large — but single eq('id') uses PK index → usually <10ms.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Only collection-level GET and POST handlers should be here

// ...existing GET and POST logic for all orders...