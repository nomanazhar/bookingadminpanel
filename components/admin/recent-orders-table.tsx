"use client"

import { memo } from "react"
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
import { format } from "date-fns"
import { parseBookingDateTime } from '@/lib/utils'

interface RecentOrdersTableProps {
  orders: OrderWithDetails[]
}

function RecentOrdersTableComponent({ orders }: RecentOrdersTableProps) {
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
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.customer.first_name} {order.customer.last_name}
              </TableCell>
              <TableCell>{order.service.name}</TableCell>
              <TableCell>
                {format(parseBookingDateTime(order.booking_date, order.booking_time || '00:00:00'), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>£{order.total_amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export const RecentOrdersTable = memo(RecentOrdersTableComponent)

