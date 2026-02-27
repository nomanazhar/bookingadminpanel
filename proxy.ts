import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr' // Make sure @supabase/ssr is installed!

// Protected paths (update to match new structure and file names)
const PROTECTED_PATHS = [
  '/admin-dashboard',
  '/', // main landing page now serves customer dashboard
  '/signin',
  '/signup',
  '/profile',
  '/my-bookings',
  '/order-history',
  '/book-consultation',
  '/confirm-booking',
]

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Early exit: skip middleware for non-protected paths
  if (!PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // 2. Fast path: Check short-lived role cookie (expiration only, no heavy crypto)
  const roleCookie = request.cookies.get('ds_role')?.value || ''

  let userRole: string | null = null
  let useFastPath = false

  if (roleCookie) {
    try {
      const idx = roleCookie.lastIndexOf('.')
      const payload = idx > 0 ? roleCookie.slice(0, idx) : roleCookie
      const [rolePart, expiresStr] = payload.split('|')
      const expires = Number(expiresStr || '0')
      const now = Math.floor(Date.now() / 1000)

      if (expires > now) {
        userRole = rolePart || null
        useFastPath = true // Valid → skip Supabase network call!
      }
    } catch {
      // Malformed → fall through
    }
  }

  // 3. Handle redirects using role (if fast path)
  if (useFastPath && userRole) {
    if (path.startsWith('/signin') || path.startsWith('/signup')) {
      const redirectUrl = userRole === 'admin' || userRole === 'doctor' ? '/admin-dashboard' : '/'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

      if (path === '/' && (userRole === 'admin' || userRole === 'doctor')) {
      return NextResponse.redirect(new URL('/admin-dashboard', request.url))
    }

    if (path.startsWith('/admin-dashboard') && userRole !== 'admin') {
      const signoutUrl = new URL('/api/auth/signout', request.url)
      signoutUrl.searchParams.set('redirect', '/')
      return NextResponse.redirect(signoutUrl)
    }

    // No redirect needed → fast path success
    return NextResponse.next()
  }

  // 4. Fallback: Full session refresh (only when needed)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This call refreshes the session if expired (network possible)
  const { data: { user } } = await supabase.auth.getUser()

  // Fallback: If we refreshed the session, redirect based on role if possible
  if (user) {
    // Fetch the user's profile to get the actual role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const actualRole = profile?.role || null
    if (actualRole === 'admin' || actualRole === 'doctor') {
      return NextResponse.redirect(new URL('/admin-dashboard', request.url))
    }
    // Otherwise, redirect to the customer dashboard
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Return the response with updated cookies (if refreshed)
  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/', // main landing page
    '/signin',
    '/signup',
    '/profile',
    '/my-bookings',
    '/order-history',
    '/book-consultation/:path*',
    '/confirm-booking',
  ],
}