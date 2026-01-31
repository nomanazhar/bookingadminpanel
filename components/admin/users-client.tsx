"use client"


import { useEffect, useMemo, useState, startTransition } from 'react'
import { UsersTable } from './users-table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import axios from 'axios'

const clientCache = new Map<string, any>()

async function fetchUsers(page: number, size: number, q: string) {
  const key = `p=${page}&s=${size}&q=${encodeURIComponent(q)}`
  if (clientCache.has(key)) return clientCache.get(key)
  const { data } = await axios.get(`/api/admin/users`, {
    params: { page, size, q }
  })
  clientCache.set(key, data)
  return data
}

export function UsersClient({ initialPage = 1, pageSize = 20 }: { initialPage?: number; pageSize?: number }) {
  const [page, setPage] = useState(initialPage)
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 400)
  const [data, setData] = useState<{ data: any[]; count: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    startTransition(() => setLoading(true))
    fetchUsers(page, pageSize, debouncedQ).then((res) => {
      if (!mounted) return
      setData(res)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { mounted = false }
  }, [page, pageSize, debouncedQ])

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil((data.count || 0) / pageSize))
  }, [data, pageSize])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Search name or email..."
          className="input input-bordered w-full max-w-sm"
        />
       
      </div>

      {loading && <div className="py-6 text-center text-muted-foreground">Loading...</div>}

      {data && (
        <UsersTable
          users={data.data.filter((user: any) => user.role !== 'admin')}
          currentPage={page}
          totalCount={data.count}
          pageSize={pageSize}
        />
      )}

      <div className="mt-4 flex items-center justify-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn">Previous</button>
        <div className="text-sm">Page {page} of {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn">Next</button>
      </div>
    </div>
  )
}

// Helper to clear the client-side users cache so other components can refresh
export function clearUsersClientCache() {
  clientCache.clear()
}
