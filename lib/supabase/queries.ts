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
export  const getCategories = unstable_cache(async () => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data as Category[]
}, ['getCategories'], { revalidate: 60 })

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
      doctor:doctors(*)
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
      doctor:doctors(*)
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
      doctor:doctors(*)
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
export async function getOrdersPaginatedAdmin(page: number = 1, pageSize: number = 20) {
  const supabase = createServiceRoleClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data as OrderWithDetails[], count: count ?? 0 }
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
export const getRecentOrdersAdmin = unstable_cache(
  async (limit: number = 5) => {
    const supabase = createServiceRoleClient()
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
  ['getRecentOrdersAdmin'],
  { revalidate: 60 }
)

