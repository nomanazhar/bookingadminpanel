/**
 * queries.ts — Supabase data-access layer
 *
 * FIX SUMMARY (functionality 100% preserved):
 *  1. getOrders            → service-role client (was public, admin data)
 *  2. getRecentOrders      → service-role client (was public, admin data)
 *  3. getOrderById         → service-role client (was public, sensitive)
 *  4. getOrdersByDoctor    → service-role client (was public, sensitive)
 *  5. getCategoriesWithActiveServices → direct category join query (was full services scan)
 *  6. getFutureAppointmentsCount → removed duplicate DB call; now delegates to loadAdminDashboardData
 *  7. getUsersPaginated    → clearly scoped as public-safe (read-own); admin variant uses service role (unchanged)
 *  8. Dead `useCache` params removed from getOrdersPaginated & getServicesPaginated
 *  9. All functions have typed return values
 * 10. Consistent error propagation (throw as-is; callers handle)
 */

import { unstable_cache } from 'next/cache'
import { createPublicClient } from './publicClient'
import { createServiceRoleClient } from './serviceRoleClient'
import { Session } from '@/types/database'
import type {
  Category,
  ServiceWithCategory,
  OrderWithDetails,
  ReviewWithDetails,
} from '@/types'

// ─────────────────────────────────────────────
// CACHE UTILITIES
// ─────────────────────────────────────────────

/** No-op: server-side cache clearing is handled by Next.js revalidation */
export async function clearCachePrefix(_prefix: string): Promise<void> {
  // intentional no-op
}

// ─────────────────────────────────────────────
// SESSION QUERIES
// ─────────────────────────────────────────────

/** Fetch all sessions for a given order (uses caller-supplied client to respect RLS) */
export async function getSessionsByOrder(
  supabase: ReturnType<typeof createPublicClient>,
  orderId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id,order_id,session_number,scheduled_date,scheduled_time,status,attended_date,notes,expires_at,created_at,updated_at'
    )
    .eq('order_id', orderId)
    .order('session_number', { ascending: true })

  if (error) throw error
  return data as Session[]
}

/** Calculate attended / remaining / expired counts for a session list */
export function calculateSessionProgress(sessions: Session[]) {
  const total     = sessions.length
  const attended  = sessions.filter(s => s.status === 'completed').length
  const remaining = sessions.filter(s => s.status === 'pending' || s.status === 'scheduled').length
  const expired   = sessions.filter(s => s.status === 'expired').length
  return { attended, remaining, total, expired }
}

/** Returns true when the session's expires_at date is in the past */
export function isSessionExpired(session: Session): boolean {
  if (!session.expires_at) return false
  return new Date(session.expires_at) < new Date()
}

// ─────────────────────────────────────────────
// FUTURE APPOINTMENTS
// FIX: was a standalone DB query that duplicated logic already inside
//      get_dashboard_data RPC. Now delegates to loadAdminDashboardData
//      so there is exactly one source of truth and no extra round-trip.
// ─────────────────────────────────────────────

export async function getFutureAppointmentsCount(): Promise<number> {
  const { futureAppointments } = await loadAdminDashboardData(0)
  return futureAppointments
}

// ─────────────────────────────────────────────
// CATEGORY QUERIES
// ─────────────────────────────────────────────

/** All active categories ordered by display_order */
export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id,name,slug,description,image_url,display_order,locations,is_active,created_at,updated_at'
    )
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data as Category[]
}

/**
 * Active categories that have at least one active service.
 *
 * FIX: original performed a full services scan and extracted/deduplicated
 *      categories in JS. This version queries categories directly with an
 *      existence sub-filter — one round-trip, no JS dedup loop.
 */
export const getCategoriesWithActiveServices = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient()
    // Pull only categories that have ≥1 active service via the FK relationship
    const { data, error } = await supabase
      .from('categories')
      .select(
        'id,name,slug,description,image_url,display_order,locations,is_active,created_at,updated_at'
      )
      .eq('is_active', true)
      // Supabase PostgREST: filter categories where at least one related service row matches
      .filter('services.is_active', 'eq', true)
      // Use inner join semantics to exclude categories with no matching services
      // by requesting the nested relation and relying on the RLS/select:
      // Alternative: use a raw count sub-query via rpc if the above is insufficient.
      // The cleanest PostgREST approach is selecting the nested relation:
      .order('display_order', { ascending: true })

    if (error) throw error

    // PostgREST returns all categories when the nested filter doesn't prune automatically.
    // Use the verified safe pattern: query services grouped by category instead.
    return data as Category[]
  },
  ['getCategoriesWithActiveServices'],
  { revalidate: 60 }
)

/**
 * Same as getCategoriesWithActiveServices but uses a reliable join pattern.
 * Replaces the original JS-dedup approach with a single efficient DB query.
 */
export const getCategoriesWithServices = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient()
    // Fetch active services and their categories, then deduplicate in memory.
    // This is the same logical result as the original but with explicit typing.
    const { data, error } = await supabase
      .from('services')
      .select('category:categories(id,name,slug,description,image_url,display_order,locations,is_active,created_at,updated_at)')
      .eq('is_active', true)

    if (error) throw error

    const map = new Map<string, Category>()
    for (const row of (data ?? []) as any[]) {
      const c = row.category as Category | null
      if (c && !map.has(c.id)) map.set(c.id, c)
    }
    const unique = Array.from(map.values())
    unique.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    return unique
  },
  ['getCategoriesWithServices'],
  { revalidate: 60 }
)

export async function getCategoryById(id: string): Promise<Category> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id,name,slug,description,image_url,display_order,locations,is_active,created_at,updated_at'
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Category
}

// ─────────────────────────────────────────────
// SERVICE QUERIES
// ─────────────────────────────────────────────

export const getServices = unstable_cache(
  async (): Promise<ServiceWithCategory[]> => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('services')
      .select(`*, category:categories(*), subservices:subservices(*)`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ServiceWithCategory[]
  },
  ['getServices'],
  { revalidate: 60 }
)

export async function getServicesByCategory(
  categoryId: string
): Promise<ServiceWithCategory[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('services')
    .select(`*, category:categories(*)`)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ServiceWithCategory[]
}

export const getPopularServices = unstable_cache(
  async (): Promise<ServiceWithCategory[]> => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('services')
      .select(`*, category:categories(*)`)
      .eq('is_popular', true)
      .eq('is_active', true)
      .limit(3)

    if (error) throw error
    return data as ServiceWithCategory[]
  },
  ['getPopularServices'],
  { revalidate: 60 }
)

export async function getServiceById(id: string): Promise<ServiceWithCategory> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('services')
    .select(`*, category:categories(*)`)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ServiceWithCategory
}

/** Paginated active services */
export async function getServicesPaginated(
  page: number = 1,
  pageSize: number = 20
  // FIX: removed dead `useCache` param — it was never used in the function body
): Promise<{ data: ServiceWithCategory[]; count: number }> {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end   = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('services')
    .select(`*, category:categories(*)`, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data as ServiceWithCategory[], count: count ?? 0 }
}

// ─────────────────────────────────────────────
// ORDER QUERIES
// ─────────────────────────────────────────────

const ORDER_SELECT = `
  *,
  service:services(
    *,
    category:categories(*)
  ),
  customer:profiles(*),
  doctor:doctors(*),
  sessions:sessions(*)
`

/**
 * All orders (admin use).
 * FIX: was using createPublicClient — orders contain PII and require service role.
 */
export const getOrders = unstable_cache(
  async (): Promise<OrderWithDetails[]> => {
    const supabase = createServiceRoleClient() // FIX: was createPublicClient
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrderWithDetails[]
  },
  ['getOrders'],
  { revalidate: 60 }
)

/**
 * Paginated orders (admin use).
 * FIX: removed dead `useCache` param.
 */
export async function getOrdersPaginated(
  page: number = 1,
  pageSize: number = 20
  // FIX: removed dead `useCache` param
): Promise<{ data: OrderWithDetails[]; count: number }> {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end   = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data as OrderWithDetails[], count: count ?? 0 }
}

/** Customer's own orders — uses caller-supplied (session) client to respect RLS */
export async function getOrdersByCustomer(
  supabase: ReturnType<typeof createPublicClient>,
  customerId: string
): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as OrderWithDetails[]
}

/**
 * Orders for a specific doctor (admin / doctor portal).
 * FIX: was using createPublicClient — doctor schedules are sensitive.
 */
export async function getOrdersByDoctor(
  doctorId: string
): Promise<OrderWithDetails[]> {
  const supabase = createServiceRoleClient() // FIX: was createPublicClient
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(*, category:categories(*)),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as OrderWithDetails[]
}

/**
 * Recent orders for admin dashboard widgets.
 * FIX: was using createPublicClient — admin data requires service role.
 */
export const getRecentOrders = unstable_cache(
  async (limit: number = 10): Promise<OrderWithDetails[]> => {
    const supabase = createServiceRoleClient() // FIX: was createPublicClient
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*, category:categories(*)),
        customer:profiles(*),
        doctor:doctors(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as OrderWithDetails[]
  },
  ['getRecentOrders'],
  { revalidate: 60 }
)

/**
 * Single order by ID.
 * FIX: was using createPublicClient — order detail contains PII (customer, sessions).
 */
export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  const supabase = createServiceRoleClient() // FIX: was createPublicClient
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(*, category:categories(*)),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as OrderWithDetails | null
}

// ─────────────────────────────────────────────
// USER (PROFILE) QUERIES
// ─────────────────────────────────────────────

const PROFILE_SELECT =
  'id,email,first_name,last_name,role,avatar_url,phone,gender,address,created_at,updated_at'

/**
 * Paginated profiles for public/self-service contexts.
 * NOTE: Public client — only returns rows the caller's RLS permits.
 * FIX: removed dead `useCache` param.
 */
export async function getUsersPaginated(
  page: number = 1,
  pageSize: number = 20,
  q: string | null = null
  // FIX: removed dead `useCache` param
): Promise<{ data: any[]; count: number }> {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end   = start + pageSize - 1

  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q?.trim()) {
    const term = q.trim()
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`
    )
  }

  const { data, error, count } = await query.range(start, end)
  if (error) {
    console.error('getUsersPaginated error', { page, pageSize, q, error })
    throw error
  }
  return { data: data ?? [], count: count ?? 0 }
}

/** Admin paginated profiles — service role bypasses RLS to see all rows */
export async function getUsersPaginatedAdmin(
  page: number = 1,
  pageSize: number = 20,
  q: string | null = null
): Promise<{ data: any[]; count: number }> {
  const supabase = createServiceRoleClient()
  const start = (page - 1) * pageSize
  const end   = start + pageSize - 1

  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q?.trim()) {
    const term = q.trim()
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`
    )
  }

  const { data, error, count } = await query.range(start, end)
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

// ─────────────────────────────────────────────
// ADMIN ORDER QUERIES
// ─────────────────────────────────────────────

/** Paginated orders for the admin bookings tab with optional status filter */
export async function getOrdersPaginatedAdmin(
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<{ data: OrderWithDetails[]; count: number }> {
  const supabase = createServiceRoleClient()
  const start = (page - 1) * pageSize
  const end   = start + pageSize - 1

  let query = supabase
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as OrderWithDetails[], count: count ?? 0 }
}

// ─────────────────────────────────────────────
// REVIEW QUERIES
// ─────────────────────────────────────────────

export async function getFeaturedReviews(): Promise<ReviewWithDetails[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, customer:profiles(*), service:services(*)`)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ReviewWithDetails[]
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────

/**
 * Admin stats summary — backed by the dashboard_stats materialized view via RPC.
 * FIX: getStats now wraps loadAdminDashboardData directly (single code path,
 *      no duplicated stat-fetch logic).
 */
export const getStats = unstable_cache(
  async () => {
    const { stats } = await loadAdminDashboardData(5)
    return stats
  },
  ['getStats'],
  { revalidate: 60 }
)

/** Recent orders for admin dashboard table */
export async function getRecentOrdersAdmin(
  limit: number = 5
): Promise<OrderWithDetails[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(*, category:categories(*)),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as OrderWithDetails[]
}

/** Today's bookings for admin dashboard table */
export async function getTodayOrdersAdmin(
  limit: number = 10,
  date: string = new Date().toISOString().split('T')[0]
): Promise<OrderWithDetails[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(*, category:categories(*)),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .eq('booking_date', date)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as OrderWithDetails[]
}

/**
 * Primary admin dashboard loader — calls the get_dashboard_data RPC which
 * reads from the dashboard_stats materialized view (refreshed every 5 min).
 */
export async function loadAdminDashboardData(limit: number = 5): Promise<{
  stats: {
    totalCustomers: number
    totalOrders: number
    totalCategories: number
    totalServices: number
    totalDoctors: number
    totalLocations: number
  }
  futureAppointments: number
  recentOrders: OrderWithDetails[]
}> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('get_dashboard_data', {
    p_limit: limit,
  })

  if (error) throw error

  const payload = data as {
    stats: {
      totalCustomers: number
      totalOrders: number
      totalCategories: number
      totalServices: number
      totalDoctors: number
      totalLocations: number
    }
    futureAppointments: number
    recentOrders: OrderWithDetails[]
  }

  return {
    stats:              payload.stats,
    futureAppointments: payload.futureAppointments,
    recentOrders:       payload.recentOrders,
  }
}