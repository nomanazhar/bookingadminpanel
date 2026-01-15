"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function OrdersPageHeader() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Bookings</h1>
        <p className="text-muted-foreground">Manage customer bookings</p>
      </div>
      <Button onClick={() => router.push("/admin/orders/new")} className="gap-2">
        <Plus className="h-4 w-4" />
        New Booking
      </Button>
    </div>
  )
}

