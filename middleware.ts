export const runtime = 'nodejs';
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const SHORT_CIRCUIT_PATHS = [
  '/admin',
  '/dashboard',
  '/signin',
  '/signup',
  '/profile-settings',
  '/my-bookings',
  '/order-history',
  '/book-consultation',
  '/confirm-booking',
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // If the request path is not one of the protected paths, skip session logic.
  if (!SHORT_CIRCUIT_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Try to read short-lived role cookie first to avoid a Supabase network call.
  try {
    const roleCookie = request.cookies.get('ds_role')?.value || ''
    let userRole: string | null = null

    if (roleCookie) {
      // cookie format: <role>|<expires>.<sig>
      const idx = roleCookie.lastIndexOf('.')
      const payload = idx > 0 ? roleCookie.slice(0, idx) : roleCookie
      const sig = idx > 0 ? roleCookie.slice(idx + 1) : ''
      const [rolePart, expiresStr] = payload.split('|')
      const expires = Number(expiresStr || '0')

      const now = Math.floor(Date.now() / 1000)
      if (expires && expires > now) {
        const secret = process.env.DS_COOKIE_SECRET || process.env.NEXT_COOKIE_SIGNING_KEY || ''
        let valid = false
        if (secret) {
          try {
            // verify HMAC-SHA256 signature via Web Crypto
            const enc = new TextEncoder()
            const keyData = enc.encode(secret)
            const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
            const payloadBytes = enc.encode(payload)
            // base64url -> Uint8Array
            const sigBase64 = sig.replace(/-/g, '+').replace(/_/g, '/')
            // pad
            const pad = sigBase64.length % 4
            const padded = sigBase64 + (pad ? '='.repeat(4 - pad) : '')
            const sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
            valid = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes)
          } catch (e) {
            valid = false
          }
        } else {
          // no secret configured: accept unsigned cookie if sig is empty
          valid = sig === ''
        }

        if (valid) userRole = rolePart || null
      }
    }

    // If we have a verified role cookie, use it to make routing decisions similar to updateSession
    if (userRole) {
      // Protect auth routes: redirect signed-in users away from signin/signup
      if (path.startsWith('/signin') || path.startsWith('/signup')) {
        const redirectUrl = userRole === 'admin' ? '/admin' : '/dashboard'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }

      // Dashboard redirect for admins
      if (path.startsWith('/dashboard')) {
        if (userRole === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
      }

      // Admin route protection: if role cookie is not admin, redirect to signin
      if (path.startsWith('/admin')) {
        if (userRole !== 'admin') {
          const signoutUrl = new URL('/api/auth/signout', request.url)
          signoutUrl.searchParams.set('redirect', '/dashboard')
          return NextResponse.redirect(signoutUrl)
        }
      }
    }
  } catch (e) {
    // If cookie read fails for any reason, fall back to server check.
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

