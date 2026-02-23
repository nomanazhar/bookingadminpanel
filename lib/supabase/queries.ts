import { Session } from '@/types/database';
// Fetch all sessions for a given order
export async function getSessionsByOrder(supabase: any, orderId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('order_id', orderId)
    .order('session_number', { ascending: true });
  if (error) throw error;
  return data as Session[];
}

// Calculate session progress for display
export function calculateSessionProgress(sessions: Session[]) {
  const total = sessions.length;
  const attended = sessions.filter(s => s.status === 'completed').length;
  const remaining = sessions.filter(s => s.status === 'pending' || s.status === 'scheduled').length;
  const expired = sessions.filter(s => s.status === 'expired').length;
  return { attended, remaining, total, expired };
}

// Check if a session is expired
export function isSessionExpired(session: Session) {
  if (!session.expires_at) return false;
  return new Date(session.expires_at) < new Date();
}
// Get count of future appointments (upcoming orders)
export async function getFutureAppointmentsCount() {
  const supabase = createServiceRoleClient();
  // Get current date and time in ISO format
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // yyyy-mm-dd
  const time = now.toTimeString().slice(0, 8); // HH:MM:SS

  // Query for orders where:
  // (booking_date > today) OR (booking_date = today AND booking_time >= now)
  // Only count those with status 'pending' or 'confirmed' (optional, can be adjusted)
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .or(`booking_date.gt.${today},and(booking_date.eq.${today},booking_time.gte.${time})`)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return count || 0;
}
import { createClient } from './server'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from './publicClient'
import { createServiceRoleClient } from './serviceRoleClient'
import type { 
  Category, 
  ServiceWithCategory,
  OrderWithDetails,
  ReviewWithDetails 
} from '@/types'

// Simple in-memory cache for short-term caching during server runtime.
const _cache: Map<string, { expiresAt: number; value: any }> = new Map()
function cacheGet(key: string) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key)
    return null
  }
  return entry.value
}
function cacheSet(key: string, value: any, ttlMs: number) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

// Clear cached keys matching a prefix (used to invalidate server-side caches)
export function clearCachePrefix(prefix: string) {
  for (const key of Array.from(_cache.keys())) {
    if (key.startsWith(prefix)) _cache.delete(key)
  }
}

// Category Queries
export async function getCategories() {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data as Category[]
}

// Return categories that have at least one active service.
export const getCategoriesWithActiveServices = unstable_cache(async () => {
  const supabase = createPublicClient()
  // Query active services and include their category object
  const { data, error } = await supabase
    .from('services')
    .select('category:categories(*)')
    .eq('is_active', true)
  if (error) throw error
  const cats = (data || [])
    .map((s: any) => s.category)
    .filter(Boolean)
  // Deduplicate by id while preserving display_order sort
  const map = new Map<string, Category>()
  for (const c of cats) {
    if (!map.has(c.id)) map.set(c.id, c)
  }
  const unique = Array.from(map.values())
  unique.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  return unique as Category[]
}, ['getCategoriesWithActiveServices'], { revalidate: 60 })

export async function getCategoryById(id: string) {
  const supabase =  createPublicClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Category
}

// Service Queries
export const getServices = unstable_cache(async () => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      category:categories(*),
      subservices:subservices(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ServiceWithCategory[]
}, ['getServices'], { revalidate: 60 })

export async function getServicesByCategory(categoryId: string) {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as ServiceWithCategory[]
}

export const getPopularServices = unstable_cache(async () => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_popular', true)
    .eq('is_active', true)
    .limit(3)
  if (error) throw error
  return data as ServiceWithCategory[]
}, ['getPopularServices'], { revalidate: 60 })

export async function getServiceById(id: string) {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as ServiceWithCategory
}

// Order Queries
export const getOrders = unstable_cache(async () => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*),
      sessions:sessions(*)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as OrderWithDetails[]
}, ['getOrders'], { revalidate: 60 })

// Paginated orders with optional short-term cache. Returns { data, count }
export async function getOrdersPaginated(page: number = 1, pageSize: number = 20, useCache: boolean = true) {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const cacheKey = `orders:page=${page}:size=${pageSize}`
  if (useCache) {
    const cached = cacheGet(cacheKey)
    if (cached) return cached
  }

  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*),
      sessions:sessions(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error

  const result = { data: data as OrderWithDetails[], count: count ?? 0 }
  if (useCache) cacheSet(cacheKey, result, 30 * 1000) // 30s cache
  return result
}

export async function getOrdersByCustomer(supabase: any, customerId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*),
      sessions(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as OrderWithDetails[]
}

export async function getOrdersByDoctor(doctorId: string) {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as OrderWithDetails[]
}
export const getRecentOrders = unstable_cache(
  async (limit: number = 10) => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(
          *,
          category:categories(*)
        ),
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

export async function getOrderById(id: string) {
  const supabase = createPublicClient()

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
  return data as any
}

// Users (profiles) - paginated
export async function getUsersPaginated(page: number = 1, pageSize: number = 20, useCache: boolean = true, q: string | null = null) {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const cacheKey = `users:page=${page}:size=${pageSize}:q=${q ?? ''}`
  if (useCache) {
    const cached = cacheGet(cacheKey)
    if (cached) return cached
  }

  // Build base query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // If a search term is provided, let the DB filter rows (case-insensitive)
  if (q && q.trim().length > 0) {
    const term = q.trim()
    // Use ilike for case-insensitive matching across first_name, last_name, email
    // Supabase .or expects comma-separated conditions
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error, count } = await query.range(start, end)

  if (error) {
    console.error('getUsersPaginated supabase error', { page, pageSize, q, error })
    throw error
  }

  const result = { data, count: count ?? 0 }
  if (useCache) cacheSet(cacheKey, result, 30 * 1000)
  return result
}

// Use service role for admin fetches
export async function getUsersPaginatedAdmin(page: number = 1, pageSize: number = 20, q: string | null = null) {
  const supabase = createServiceRoleClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q && q.trim().length > 0) {
    const term = q.trim()
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error, count } = await query.range(start, end)
  if (error) throw error
  return { data, count: count ?? 0 }
}

// All bookings tab
export async function getOrdersPaginatedAdmin(page: number = 1, pageSize: number = 20, status?: string) {
  const supabase = createServiceRoleClient();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*),
      sessions:sessions(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as OrderWithDetails[], count: count ?? 0 };
}

// Services - paginated
export async function getServicesPaginated(page: number = 1, pageSize: number = 20, useCache: boolean = true) {
  const supabase = createPublicClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const cacheKey = `services:page=${page}:size=${pageSize}`
  if (useCache) {
    const cached = cacheGet(cacheKey)
    if (cached) return cached
  }

  const { data, error, count } = await supabase
    .from('services')
    .select(`
      *,
      category:categories(*)
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error

  const result = { data: data as ServiceWithCategory[], count: count ?? 0 }
  if (useCache) cacheSet(cacheKey, result, 30 * 1000)
  return result
}

// Review Queries
export async function getFeaturedReviews() {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      customer:profiles(*),
      service:services(*)
    `)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as ReviewWithDetails[]
}

// Stats Queries (for admin dashboard)
export const getStats = unstable_cache(async () => {
  const supabase = createServiceRoleClient()
  // Run count queries in parallel to reduce total latency.
  const [profilesRes, ordersRes, categoriesRes, servicesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (ordersRes.error) throw ordersRes.error
  if (categoriesRes.error) throw categoriesRes.error
  if (servicesRes.error) throw servicesRes.error
  return {
    totalCustomers: profilesRes.count || 0,
    totalOrders: ordersRes.count || 0,
    totalCategories: categoriesRes.count || 0,
    totalServices: servicesRes.count || 0,
  }
}, ['getStats'], { revalidate: 60 })
export async function getRecentOrdersAdmin(limit: number = 5) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as OrderWithDetails[];
}

