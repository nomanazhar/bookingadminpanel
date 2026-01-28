import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function hmacSha256Base64Url(payload: string, secret: string) {
  // Prefer Web Crypto (Edge/Browser). Fallback to dynamic Node import when available.
  const enc = new TextEncoder()
  const data = enc.encode(payload)

  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
    const key = await (globalThis as any).crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sigBuf = await (globalThis as any).crypto.subtle.sign('HMAC', key, data)
    const bytes = new Uint8Array(sigBuf as ArrayBuffer)
    // base64url encode
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = (globalThis as any).btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  // Node fallback (dynamic import to avoid static Node import in Edge)
  try {
    const crypto = await import('crypto')
    // Node's crypto supports base64url digest directly
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  } catch {
    // As a last resort, return empty signature
    return ''
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: {
              path?: string
              domain?: string
              httpOnly?: boolean
              secure?: boolean
              sameSite?: "lax" | "strict" | "none"
              maxAge?: number
              expires?: Date
            }
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user role from profiles table
  let userRole = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    userRole = profile?.role
    // write a short-lived signed role cookie so middleware can make routing decisions
    try {
      const roleValue = userRole || ''
      const ttlSeconds = 30
      const expires = Math.floor(Date.now() / 1000) + ttlSeconds
      const payload = `${roleValue}|${expires}`
      const secret = process.env.DS_COOKIE_SECRET || process.env.NEXT_COOKIE_SIGNING_KEY || ''
      let sig = ''
      if (secret) {
        sig = await hmacSha256Base64Url(payload, secret)
      }
      const cookieVal = `${payload}.${sig}`
      const opts: any = {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: ttlSeconds,
      }
      if (process.env.NODE_ENV === 'production') opts.secure = true
      supabaseResponse.cookies.set('ds_role', cookieVal, opts)
    } catch {
      // non-blocking: if cookie set fails, continue without crashing
    }
  }

  // If there is no user, ensure role cookie is cleared
  if (!user) {
    try {
      supabaseResponse.cookies.set('ds_role', '', { path: '/', maxAge: 0 })
    } catch {
      // ignore
    }
  }

  const path = request.nextUrl.pathname

  // Protect auth routes
  if (path.startsWith('/signin') || path.startsWith('/signup')) {
    if (user) {
      // Redirect to appropriate dashboard based on role
      const redirectUrl = userRole === 'admin' ? '/admin-dashboard' : '/'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  // Protect dashboard routes
  // If an admin is logged in and hits the main dashboard, redirect to admin-dashboard
  if (path === '/' && userRole === 'admin') {
    return NextResponse.redirect(new URL('/admin-dashboard', request.url))
  }

  // Protect admin-dashboard routes
  if (path.startsWith('/admin-dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    if (userRole !== 'admin') {
      // Sign out the user and redirect to signin for a fresh login
      const signoutUrl = new URL('/api/auth/signout', request.url)
      signoutUrl.searchParams.set('redirect', '/signin')
      return NextResponse.redirect(signoutUrl)
    }
  }

  return supabaseResponse
}

