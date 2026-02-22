// scripts/auto-complete-sessions.ts

import { createServiceRoleClient } from '@/lib/supabase/serviceRoleClient';
import type { Session } from '@/types/database';

/**
 * Mark all past scheduled/pending sessions as completed.
 * - Only sessions with scheduled_date < today and status 'scheduled' or 'pending'
 * - Skips already completed/cancelled/expired/missed
 * - Batch update for performance, fallback to individual if needed
 */
export async function autoCompleteSessions({
  dryRun = false,
  maxAgeDays = 60,
}: {
  dryRun?: boolean;
  maxAgeDays?: number;
} = {}): Promise<{ updated: number; skipped: number; errors: string[] }> {
  const supabase = createServiceRoleClient();

  // Get today's date in UTC (YYYY-MM-DD)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Cutoff for max age
  const cutoff = new Date(today);
  cutoff.setUTCDate(today.getUTCDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  console.log(`[AutoComplete] Checking sessions before ${todayStr} (cutoff: ${cutoffStr})`);

  // Fetch eligible sessions
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_date, status')
    .in('status', ['scheduled', 'pending'])
    .lt('scheduled_date', todayStr)
    .gte('scheduled_date', cutoffStr);

  if (error) {
    console.error('[AutoComplete] Fetch error:', error);
    throw error;
  }

  const sessions = (data ?? []) as Pick<Session, 'id' | 'scheduled_date' | 'status'>[];
  if (sessions.length === 0) {
    console.log('[AutoComplete] No sessions to complete.');
    return { updated: 0, skipped: 0, errors: [] };
  }

  if (dryRun) {
    console.log('[DRY RUN] Would update:');
    sessions.forEach(s => {
      console.log(`  - ID ${s.id} | ${s.scheduled_date} | ${s.status}`);
    });
    return { updated: 0, skipped: sessions.length, errors: [] };
  }

  // Batch update
  const sessionIds = sessions.map(s => s.id);
  const attendedDate = todayStr;
  const { error: batchError } = await supabase
    .from('sessions')
    .update({ status: 'completed', attended_date: attendedDate } as Partial<Session>)
    .in('id', sessionIds);

  let updatedCount = 0;
  const errors: string[] = [];

  if (batchError) {
    console.warn('[AutoComplete] Batch update failed, falling back to individual updates:', batchError.message);
    for (const s of sessions) {
      const { error: singleError } = await supabase
        .from('sessions')
        .update({ status: 'completed', attended_date: s.scheduled_date || attendedDate } as Partial<Session>)
        .eq('id', s.id);
      if (singleError) {
        errors.push(`Session ${s.id}: ${singleError.message}`);
      } else {
        updatedCount++;
      }
    }
  } else {
    updatedCount = sessions.length;
  }

  console.log(`[AutoComplete] Done: ${updatedCount} updated, ${errors.length} errors`);
  return { updated: updatedCount, skipped: sessions.length - updatedCount, errors };
}

// CLI/manual run
if (require.main === module) {
  (async () => {
    try {
      const result = await autoCompleteSessions({ maxAgeDays: 90 });
      console.log('Result:', result);
      if (result.errors.length > 0) {
        console.warn('Some sessions failed to update.');
      }
    } catch (err) {
      console.error('Fatal error:', err);
      process.exit(1);
    }
  })();
}