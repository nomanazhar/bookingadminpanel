import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ServiceSessionOptions, ServiceSessionPackage } from "@/types/database"

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

export function defaultDiscountPercentForSessions(sessions: number) {
  switch (sessions) {
     case 1:
      return 0
    case 3:
      return 20
    case 6:
      return 30
    case 10:
      return 40
    default:
      return 0
  }
}

export function buildDefaultSessionPackages(maxSessions = 10, enabled = false): ServiceSessionPackage[] {
  return Array.from({ length: maxSessions }, (_, idx) => {
    const sessions = idx + 1
    return {
      label: `${sessions} session${sessions === 1 ? "" : "s"}`,
      sessions,
      discountPercent: defaultDiscountPercentForSessions(sessions),
      enabled,
    }
  })
}

function parseJsonLike(raw: unknown): unknown {
  if (typeof raw !== "string") return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export function extractSessionCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(10, Math.trunc(value)))
  }

  const text = String(value || "")
  const match = text.match(/(\d+)/)
  if (!match) return 1
  const parsed = Number.parseInt(match[1], 10)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(10, parsed))
}

function sanitizeDiscountPercent(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

function normalizePackageLabel(rawLabel: unknown, sessions: number) {
  const label = String(rawLabel || "").trim()
  return label || `${sessions} session${sessions === 1 ? "" : "s"}`
}

export function parseServiceSessionOptions(raw: unknown): ServiceSessionOptions {
  const parsed = parseJsonLike(raw)
  const result: ServiceSessionOptions = {
    options: [],
    times_of_day: [],
  }

  let optionsRaw: unknown[] = []

  if (Array.isArray(parsed)) {
    optionsRaw = parsed
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>
    if (Array.isArray(record.options)) {
      optionsRaw = record.options
    }
    if (Array.isArray(record.times_of_day)) {
      result.times_of_day = record.times_of_day
        .map((v) => String(v).trim())
        .filter(Boolean)
    }
  }

  const bySession = new Map<number, ServiceSessionPackage>()

  for (const item of optionsRaw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>
      const sessions = extractSessionCount(record.sessions ?? record.label)
      bySession.set(sessions, {
        label: normalizePackageLabel(record.label, sessions),
        sessions,
        discountPercent: sanitizeDiscountPercent(
          record.discountPercent ?? record.discount_percent ?? record.discount
        ),
        enabled: record.enabled === undefined ? true : Boolean(record.enabled),
      })
      continue
    }

    const sessions = extractSessionCount(item)
    bySession.set(sessions, {
      label: `${sessions} session${sessions === 1 ? "" : "s"}`,
      sessions,
      discountPercent: defaultDiscountPercentForSessions(sessions),
      enabled: true,
    })
  }

  result.options = Array.from(bySession.values()).sort((a, b) => a.sessions - b.sessions)
  return result
}

export function toEditableSessionPackages(raw: unknown): ServiceSessionPackage[] {
  const defaults = buildDefaultSessionPackages(10, false)
  const parsed = parseServiceSessionOptions(raw)
  const parsedBySession = new Map(parsed.options.map((opt) => [opt.sessions, opt]))

  return defaults.map((def) => {
    const existing = parsedBySession.get(def.sessions)
    if (!existing) return def
    return {
      label: normalizePackageLabel(existing.label, existing.sessions),
      sessions: existing.sessions,
      discountPercent: sanitizeDiscountPercent(existing.discountPercent),
      enabled: existing.enabled === undefined ? true : Boolean(existing.enabled),
    }
  })
}

export function buildSessionOptionsPayload(
  packages: ServiceSessionPackage[],
  timesOfDay: string[]
): ServiceSessionOptions {
  return {
    options: packages
      .filter((pkg) => Boolean(pkg.enabled))
      .map((pkg) => ({
        label: normalizePackageLabel(pkg.label, pkg.sessions),
        sessions: extractSessionCount(pkg.sessions),
        discountPercent: sanitizeDiscountPercent(pkg.discountPercent),
        enabled: true,
      }))
      .sort((a, b) => a.sessions - b.sessions),
    times_of_day: timesOfDay.map((v) => String(v).trim()).filter(Boolean),
  }
}

export function getSessionPackageLabels(raw: unknown): string[] {
  const parsed = parseServiceSessionOptions(raw)
  const enabled = parsed.options.filter((opt) => opt.enabled !== false)
  if (enabled.length === 0) {
    return buildDefaultSessionPackages(10, true).map((pkg) => pkg.label)
  }
  return enabled.map((pkg) => pkg.label)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function getPackageBySelection(raw: unknown, selection: string | number) {
  const parsed = parseServiceSessionOptions(raw)
  const enabledPackages = parsed.options.filter((opt) => opt.enabled !== false)
  const sessions = extractSessionCount(selection)
  const selectedLabel = String(selection || "").trim().toLowerCase()

  return (
    enabledPackages.find((opt) => opt.sessions === sessions) ||
    enabledPackages.find((opt) => opt.label.trim().toLowerCase() === selectedLabel)
  )
}

export function calculateSessionPricing(
  basePrice: number,
  sessionOptionsRaw: unknown,
  selection: string | number
) {
  const sessions = extractSessionCount(selection)
  const matchedPackage = getPackageBySelection(sessionOptionsRaw, selection)
  const discountPercent = sanitizeDiscountPercent(
    matchedPackage?.discountPercent ?? defaultDiscountPercentForSessions(sessions)
  )

  const safeBasePrice = Number.isFinite(basePrice) ? Number(basePrice) : 0
  const unitPrice = roundCurrency(safeBasePrice * (1 - discountPercent / 100))
  const totalAmount = roundCurrency(unitPrice * sessions)

  return {
    sessions,
    discountPercent,
    unitPrice,
    totalAmount,
    packageLabel: matchedPackage?.label || `${sessions} session${sessions === 1 ? "" : "s"}`,
  }
}

