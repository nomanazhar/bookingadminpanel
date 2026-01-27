"use client"

import { memo, useState, useMemo } from "react"
import TableSearchBar from './table-search-bar'
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
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(order => {
      const fields = [
        order.customer?.first_name,
        order.customer?.last_name,
        order.customer?.email,
        order.service?.name,
        order.booking_date,
        order.booking_time,
        order.total_amount?.toString(),
        order.status,
        order.id,
      ].join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [orders, search]);

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
    <div>
      <TableSearchBar onSearch={setSearch} placeholder="Search bookings..." />
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
            {filtered.map((order) => (
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
    </div>
  )
}

export const RecentOrdersTable = memo(RecentOrdersTableComponent)

