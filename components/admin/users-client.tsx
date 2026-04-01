"use client"


import { useEffect, useMemo, useState, startTransition } from 'react'
import { UsersTable } from './users-table'
import { CreateCustomerDialog } from './create-customer-dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Button } from '@/components/ui/button'
import { Plus, RotateCcw } from 'lucide-react'
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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

  const handleCustomerCreated = async () => {
    // Clear server-side cache first
    try {
      await axios.post('/api/admin/clear-users-cache')
    } catch (error) {
      console.error('Failed to clear server cache:', error)
    }
    
    // Clear client-side cache immediately
    clientCache.clear()
    
    // Set loading state before fetching
    setLoading(true)
    
    try {
      // Fetch fresh data without using cache
      const freshData = await axios.get(`/api/admin/users`, {
        params: { page: 1, size: pageSize, q: '' }
      })
      
      // Update the data state
      setData(freshData.data)
      
      // Reset to first page and clear search
      setPage(1)
      setQ('')
    } catch (error) {
      console.error('Failed to refresh users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    // Clear all caches
    try {
      await axios.post('/api/admin/clear-users-cache')
    } catch (error) {
      console.error('Failed to clear server cache:', error)
    }
    
    clientCache.clear()
    
    // Set loading state
    setLoading(true)
    
    try {
      // Fetch fresh data
      const freshData = await axios.get(`/api/admin/users`, {
        params: { page, size: pageSize, q: debouncedQ }
      })
      
      // Update the data state
      setData(freshData.data)
    } catch (error) {
      console.error('Failed to refresh users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
       <p>Manage all Users</p>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={loading}
            title="Refresh users list"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" disabled={loading}>
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>
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

      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  )
}

// Helper to clear the client-side users cache so other components can refresh
export function clearUsersClientCache() {
  clientCache.clear()
}
