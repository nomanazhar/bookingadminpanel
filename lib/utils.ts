import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse booking date and time strings (YYYY-MM-DD and HH:MM:SS) into a local Date.
 * This avoids inconsistent ISO string parsing which can be interpreted as UTC
 * and cause off-by-one-day issues in some environments.
 */
export function parseBookingDateTime(dateStr: string, timeStr?: string) {
  if (!dateStr) return new Date(NaN)
  const dateParts = String(dateStr).split('-')
  const [y, m, d] = dateParts.map(p => Number(p))
  const t = String(timeStr || '00:00:00').split(':').map(p => Number(p))
  const hh = t[0] || 0
  const mm = t[1] || 0
  const ss = t[2] || 0
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss)
}

