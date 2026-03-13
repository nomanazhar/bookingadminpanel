import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── HMAC helper (Edge + Node compatible) ────────────────────────────────────
async function hmacSha256Base64Url(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    const key = await (globalThis as any).crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const sigBuf = await (globalThis as any).crypto.subtle.sign('HMAC', key, enc.encode(payload))
    const bytes = new Uint8Array(sigBuf as ArrayBuffer)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return (globalThis as any).btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  try {
    const crypto = await import('crypto')
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  } catch {
    return ''
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
async function buildRoleCookie(role: string): Promise<string> {
  const ttl = 3600 // 60 minutes
  const expires = Math.floor(Date.now() / 1000) + ttl
  const payload = `${role}|${expires}`
  const secret = process.env.DS_COOKIE_SECRET || process.env.NEXT_COOKIE_SIGNING_KEY || ''
  const sig = secret ? await hmacSha256Base64Url(payload, secret) : ''
  return `${payload}.${sig}`
}

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

// ─── Routes that need auth checks ────────────────────────────────────────────
const ADMIN_PATHS   = ['/admin-dashboard']
const AUTH_PATHS    = ['/signin', '/signup']
const CUSTOMER_PATHS = ['/profile', '/my-bookings', '/order-history', '/book-consultation', '/confirm-booking']

function isAdminPath(p: string)    { return ADMIN_PATHS.some(a => p === a || p.startsWith(a + '/')) }
function isAuthPath(p: string)     { return AUTH_PATHS.some(a => p === a || p.startsWith(a + '/')) }
function isCustomerPath(p: string) { return CUSTOMER_PATHS.some(a => p === a || p.startsWith(a + '/')) }

// ─── Main middleware ──────────────────────────────────────────────────────────
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip static assets and Next internals
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // ── FAST PATH: valid signed role cookie ──────────────────────────────────
  const rawCookie = request.cookies.get('ds_role')?.value || ''
  if (rawCookie) {
    const { role, valid } = parseRoleCookie(rawCookie)
    if (valid && role) {
      // Auth pages: redirect already-logged-in users away
      if (isAuthPath(path)) {
        const dest = (role === 'admin' || role === 'doctor') ? '/admin-dashboard' : '/'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      // Root: redirect admin/doctor to their dashboard
      if (path === '/' && (role === 'admin' || role === 'doctor')) {
        return NextResponse.redirect(new URL('/admin-dashboard', request.url))
      }

      // Admin-dashboard: block non-admins
      if (isAdminPath(path)) {
        if (role === 'admin') return NextResponse.next()
        if (role === 'doctor') {
          // Doctor page-level check happens in slow path (needs DB)
          // Fall through to slow path for doctors on admin routes
        } else {
          // Customer trying to access admin — sign them out
          const url = new URL('/api/auth/signout', request.url)
          url.searchParams.set('redirect', '/')
          return NextResponse.redirect(url)
        }
      }

      // Customer-only paths: must be logged in (any role is fine here)
      // Nothing to block — they have a valid cookie
      return NextResponse.next()
    }
  }

  // ── SLOW PATH: verify session via Supabase ───────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: getUser() must be called before any redirects
  const { data: { user } } = await supabase.auth.getUser()

  // No session
  if (!user) {
    // Clear stale role cookie
    supabaseResponse.cookies.set('ds_role', '', { path: '/', maxAge: 0 })

    // Protect customer-only and admin paths
    if (isAdminPath(path) || isCustomerPath(path)) {
      const url = new URL('/signin', request.url)
      url.searchParams.set('redirect', path)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // ── Fetch role from DB (slow path only, cookie was missing/expired) ──────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string = profile?.role ?? 'customer'

  // Write fresh signed role cookie
  try {
    const cookieVal = await buildRoleCookie(role)
    const opts: Record<string, any> = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600,
    }
    if (process.env.NODE_ENV === 'production') opts.secure = true
    supabaseResponse.cookies.set('ds_role', cookieVal, opts)
  } catch {
    // non-blocking
  }

  // ── Role-based routing ────────────────────────────────────────────────────

  // Auth pages: redirect logged-in users away
  if (isAuthPath(path)) {
    const dest = (role === 'admin' || role === 'doctor') ? '/admin-dashboard' : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Root: redirect admin/doctor to dashboard
  if (path === '/' && (role === 'admin' || role === 'doctor')) {
    return NextResponse.redirect(new URL('/admin-dashboard', request.url))
  }

  // Admin dashboard protection
  if (isAdminPath(path)) {
    if (role === 'admin') return supabaseResponse

    if (role === 'doctor') {
      // Check which pages this doctor is allowed to see
      const { data: doctor } = await supabase
        .from('doctors')
        .select('allowed_admin_pages')
        .eq('email', user.email)
        .single()

      const pageMatch = path.match(/^\/admin-dashboard\/?([^/]*)/)
      const pageSlug  = pageMatch?.[1] || ''
      const allowed   = (doctor?.allowed_admin_pages as string[]) || []

      // Allow access to the dashboard root itself
      if (!pageSlug || allowed.includes(pageSlug)) return supabaseResponse

      return NextResponse.redirect(new URL('/admin-dashboard', request.url))
    }

    // Customer trying admin routes
    const url = new URL('/api/auth/signout', request.url)
    url.searchParams.set('redirect', '/')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
 
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}