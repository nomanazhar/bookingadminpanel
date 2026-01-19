"use client"
import axios from 'axios'
import { memo } from "react"
import { useRouter } from "next/navigation"
import type { OrderWithDetails } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { parseBookingDateTime } from '@/lib/utils'

interface OrdersTableProps {
  orders: OrderWithDetails[]
  currentPage?: number
  totalCount?: number
  pageSize?: number
}

function OrdersTableComponent({ orders, currentPage, totalCount, pageSize }: OrdersTableProps) {
  const router = useRouter()
  
  const handleConfirm = async (orderId: string) => {
    try {
      await axios.patch(`/api/orders/${orderId}`, { status: 'confirmed' })
      // Clear cache and refresh the page to reload server component data
      try {
        await axios.post('/api/admin/clear-orders-cache')
      } catch {}
      router.refresh() // Refresh server component to get updated data
    } catch {
      alert('Failed to confirm order.')
    }
  }
  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "confirmed":
        return "default"
      case "pending":
        return "secondary"
      case "completed":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "default"
    }
  }

  if (!orders) return <div>Loading...</div>;
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No Bookings yet
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Sessions</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Booking Date</TableHead>
            <TableHead>Booking Time</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: OrderWithDetails) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <div>
                  <div>
                    {order.customer?.first_name || order.customer_name || 'Unknown'}{' '}
                    {order.customer?.last_name || ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.customer?.email || order.customer_email || ''}
                    {order.customer_phone ? ` • ${order.customer_phone}` : ''}
                  </div>
                </div>
              </TableCell>
              <TableCell>{order.service ? order.service.name : <span className="text-muted-foreground">(no service)</span>}</TableCell>
              <TableCell className="font-medium">{order.session_count} {order.session_count === 1 ? 'session' : 'sessions'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{order.address || '-'}</TableCell>
              <TableCell>
                {format(parseBookingDateTime(order.booking_date, order.booking_time || '00:00:00'), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>
                {format(parseBookingDateTime(order.booking_date, order.booking_time || '00:00:00'), 'p')}
              </TableCell>
              <TableCell>£{order.total_amount.toFixed(2)}</TableCell>
              <TableCell>
                {order.status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition"
                      disabled
                    >
                      Pending
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition"
                      onClick={() => handleConfirm(order.id)}
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem 
                      onSelect={() => router.push(`/admin/orders/${order.id}/edit`)}
                      className="cursor-pointer">
                     Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Simple pagination controls (server rendered links) */}
      {typeof currentPage !== 'undefined' && typeof totalCount !== 'undefined' && (
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">Showing page {currentPage}</div>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <a href={`?page=${currentPage - 1}`} className="btn">Previous</a>
            )}
            {currentPage * (pageSize || 20) < (totalCount || 0) && (
              <a href={`?page=${currentPage + 1}`} className="btn">Next</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const OrdersTable = memo(OrdersTableComponent)

