"use client"

import axios from "axios"
import { memo, useMemo, useState } from "react"
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
import { format, addMinutes } from "date-fns"
import { parseBookingDateTime } from "@/lib/utils"
import TableSearchBar from "./table-search-bar"

interface OrdersTableProps {
  orders: OrderWithDetails[]
  currentPage?: number
  totalCount?: number
  pageSize?: number
}

function getStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return "default"
    case "cancelled":
      return "destructive"
    case "pending":
    default:
      return "secondary"
  }
}

function OrdersTableComponent({
  orders,
  currentPage,
  totalCount,
  pageSize = 20,
}: OrdersTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter((order) => {
      // Combine all relevant fields for searching
      const locations = Array.isArray(order.service?.locations) ? order.service.locations.join(' ') : '';
      const fields = [
        order.customer?.first_name,
        order.customer?.last_name,
        order.customer?.email,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.service?.name,
        order.service_title,
        order.doctor?.first_name,
        order.doctor?.last_name,
        order.doctor?.email,
        order.address,
        order.status,
        order.booking_date,
        order.booking_time,
        order.total_amount?.toString(),
        order.id,
        locations,
      ].join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [orders, search]);

  const handleConfirm = async (orderId: string) => {
    await axios.patch(`/api/orders/${orderId}`, { status: 'confirmed' })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <TableSearchBar 
      value={search} 
      onChange={setSearch}
      onSearch={() => {}}
       />

      <Table>
        <TableHeader className="bg-[#333333] text-white">
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            {/* <TableHead>Locations</TableHead> */}
            <TableHead>Sessions</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Booking Date</TableHead>
            <TableHead>Booking Time</TableHead>
            {/* <TableHead>Amount</TableHead> */}
            <TableHead>Status</TableHead>
             <TableHead>Comments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <div>
                  <div>
                    {order.customer_name || "Unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.customer_email || ""}
                    {order.customer_phone ? ` • ${order.customer_phone}` : ""}
                  </div>
                </div>
              </TableCell>


              <TableCell>
                {order.service ? (
                  order.service.name
                ) : (
                  <span className="text-muted-foreground">(no service)</span>
                )}
              </TableCell>

              {/* <TableCell>
                {Array.isArray(order.service?.locations) && order.service.locations.length > 0
                  ? order.service.locations.map((loc) => (
                      <span key={loc} className="inline-block bg-muted px-2 py-0.5 rounded text-xs mr-1 capitalize">
                        {loc}
                      </span>
                    ))
                  : "-"}
              </TableCell> */}

              <TableCell className="font-medium">
                {order.session_count}{" "}
                {order.session_count === 1 ? "session" : "sessions"}
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {order.address || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {order.customer_phone || "-"}
              </TableCell>

              <TableCell>
                {format(
                  parseBookingDateTime(
                    order.booking_date,
                    order.booking_time || "00:00:00"
                  ),
                  "MMM dd, yyyy"
                )}
              </TableCell>

              <TableCell>
                  {(() => {
                    const startDate = parseBookingDateTime(
                      order.booking_date,
                      order.booking_time || "00:00:00"
                    );
                    const duration = order.service?.duration_minutes;
                    if (typeof duration === 'number' && !isNaN(duration)) {
                      const endDate = addMinutes(startDate, duration);
                      return `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
                    } else {
                      return format(startDate, "p");
                    }
                  })()}
              </TableCell>

              {/* <TableCell>£{order.total_amount.toFixed(2)}</TableCell> */}

              <TableCell>
                {(() => {
                  const bookingDateTime = parseBookingDateTime(order.booking_date, order.booking_time || "00:00:00");
                  const now = new Date();
                  // If pending and booking time has passed
                  if (order.status === "pending" && bookingDateTime < now) {
                    return (
                      <Badge variant="destructive">
                        Not available / Expired
                      </Badge>
                    );
                  }
                  // If pending and booking time is upcoming
                  if (order.status === "pending") {
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          disabled
                          className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300"
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
                    );
                  }
                  // Otherwise, show normal status
                  return (
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  );
                })()}
              </TableCell>

              <TableCell>
                {order.notes ? (
                  <span className="text-sm text-muted-foreground">
                    {order.notes.length > 40
                      ? `${order.notes.substring(0, 40)}...`
                      : order.notes}
                  </span>
                ) : (
                  "-"
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
                      onSelect={() =>
                        router.push(`/orders/${order.id}/edit`)
                      }
                      className="cursor-pointer"
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        router.push(`/orders/new?duplicate=${order.id}`)
                      }
                      className="cursor-pointer"
                    >
                      Duplicate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {typeof currentPage !== "undefined" &&
        typeof totalCount !== "undefined" && (
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              Showing page {currentPage}
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <a href={`?page=${currentPage - 1}`} className="btn">
                  Previous
                </a>
              )}
              {currentPage * pageSize < totalCount && (
                <a href={`?page=${currentPage + 1}`} className="btn">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
    </div>
  )
}

export const OrdersTable = memo(OrdersTableComponent)
