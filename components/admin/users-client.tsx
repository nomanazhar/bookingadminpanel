"use client"


import { useEffect, useMemo, useState, startTransition } from 'react'
import { UsersTable } from './users-table'
import { CreateCustomerDialog } from './create-customer-dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Button } from '@/components/ui/button'
import { Plus, RotateCcw } from 'lucide-react'
import axios from 'axios'

const clientCache = new Map<string, any>()

async function fetchUsers(page: number, size: number, q: string, role: string = 'customer') {
  const key = `p=${page}&s=${size}&q=${encodeURIComponent(q)}&r=${encodeURIComponent(role)}`
  if (clientCache.has(key)) return clientCache.get(key)
  const { data } = await axios.get(`/api/admin/users`, {
    params: { page, size, q, role }
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
  // single dialog state for both create and edit to keep behavior consistent
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogInitialData, setDialogInitialData] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    startTransition(() => setLoading(true))
    fetchUsers(page, pageSize, debouncedQ, 'customer').then((res) => {
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
        params: { page: 1, size: pageSize, q: '', role: 'customer' }
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

  const handleOpenCreate = () => {
    setDialogMode('create')
    setDialogInitialData(null)
    setDialogOpen(true)
  }

  const handleEditUser = (user: any) => {
    setDialogMode('edit')
    setDialogInitialData(user)
    setDialogOpen(true)
  }


  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
       <p>Manage all Users</p>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {loading && <div className="py-6 text-center text-muted-foreground">Loading...</div>}

      {data && (
        <UsersTable
            users={data.data.filter((user: any) => user.role === 'customer')}
            currentPage={page}
            totalCount={data.count}
            pageSize={pageSize}
            onEdit={handleEditUser}
          />
      )}

      <div className="mt-4 flex items-center justify-start gap-6">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn border border-2 px-2 rounded-md">Previous</button>
        <div className="text-sm">Page {page} of {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn border border-2 px-2 rounded-md">Next</button>
      </div>

      <CreateCustomerDialog
        open={dialogOpen}
        onOpenChange={(v) => setDialogOpen(v)}
        mode={dialogMode}
        initialData={dialogInitialData}
        onSaved={handleCustomerCreated}
      />
    </div>
  )
}

// Helper to clear the client-side users cache so other components can refresh
export function clearUsersClientCache() {
  clientCache.clear()
}
