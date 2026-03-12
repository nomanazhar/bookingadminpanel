/**
 * proxy.ts — Fast-path role guard used by some route handlers.
 *
 * ROOT CAUSE FIX:
 * The original proxy.ts had its own Supabase session check that ran AFTER
 * the real middleware (updateSession) already ran. This created two problems:
 *   1. Double DB round-trips on every protected request
 *   2. The fallback session check here used createServerClient with the anon
 *      key but WITHOUT properly forwarding the refreshed cookie back — meaning
 *      the session could be seen as invalid even when the user was logged in.
 *
 * Now proxy.ts is FAST-PATH ONLY. It reads the signed ds_role cookie that
 * middleware.ts already wrote. If the cookie is missing/expired it simply
 * lets the request through (middleware already handled the redirect logic).
 * This file is intentionally lightweight.
 */

import { type NextRequest, NextResponse } from 'next/server'

function parseRoleCookie(raw: string): { role: string; valid: boolean } {
  try {
    const lastDot = raw.lastIndexOf('.')
    const payload = lastDot > 0 ? raw.slice(0, lastDot) : raw
    const [role, expStr] = payload.split('|')
    const exp = Number(expStr || '0')
    const now = Math.floor(Date.now() / 1000)
    if (role && exp > now) return { role, valid: true }
  } catch {}
  return { role: '', valid: false }
}

const ADMIN_PATHS    = ['/admin-dashboard']
const AUTH_PATHS     = ['/signin', '/signup']

function isAdminPath(p: string) { return ADMIN_PATHS.some(a => p === a || p.startsWith(a + '/')) }
function isAuthPath(p: string)  { return AUTH_PATHS.some(a => p === a || p.startsWith(a + '/')) }

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const rawCookie = request.cookies.get('ds_role')?.value || ''
  if (!rawCookie) {
    // No cookie — middleware.ts handles this case; let the request through
    return NextResponse.next()
  }

  const { role, valid } = parseRoleCookie(rawCookie)
  if (!valid || !role) {
    // Expired or invalid — middleware.ts will handle on next request
    return NextResponse.next()
  }

  // Auth pages: bounce already-logged-in users
  if (isAuthPath(path)) {
    const dest = (role === 'admin' || role === 'doctor') ? '/admin-dashboard' : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Root: send admin/doctor to their dashboard
  if (path === '/' && (role === 'admin' || role === 'doctor')) {
    return NextResponse.redirect(new URL('/admin-dashboard', request.url))
  }

  // Admin dashboard: block non-admins/non-doctors immediately
  if (isAdminPath(path) && role !== 'admin' && role !== 'doctor') {
    const url = new URL('/api/auth/signout', request.url)
    url.searchParams.set('redirect', '/')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}