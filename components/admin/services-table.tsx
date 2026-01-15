"use client"

import { memo } from "react"
import Image from 'next/image'
import type { ServiceWithCategory } from "@/types"
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
import { Edit, Trash } from "lucide-react"
import { useState } from "react"

interface ServicesTableProps {
  services: ServiceWithCategory[]
}

function ServicesTableComponent({ services }: ServicesTableProps) {
  const [showActions, setShowActions] = useState<string | null>(null)
  
  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No Treatmens yet
      </div>
    )
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Sessions</TableHead>
            <TableHead>Available Times</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Popular</TableHead>
            <TableHead className="text-right">Manage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            let sessions = "-"
            let times = "-"
            if (service.session_options) {
              try {
                const parsed = typeof service.session_options === "string" ? JSON.parse(service.session_options) : service.session_options
                if (Array.isArray(parsed)) {
                  sessions = parsed.join(", ")
                } else if (parsed && typeof parsed === "object") {
                  sessions = Array.isArray(parsed.options) ? parsed.options.join(", ") : "-"
                  times = Array.isArray(parsed.times_of_day) ? parsed.times_of_day.join(", ") : "-"
                }
              } catch {}
            }
            return (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.category?.name || "-"}</TableCell>
                <TableCell>{service.thumbnail ? <Image src={service.thumbnail} alt="thumb" width={48} height={48} className="rounded object-cover" /> : "-"}</TableCell>
                <TableCell>£{service.base_price?.toFixed ? service.base_price.toFixed(2) : service.base_price}</TableCell>
                <TableCell>{service.description || "-"}</TableCell>
                <TableCell>{service.duration_minutes || "-"}</TableCell>
                <TableCell>{sessions}</TableCell>
                <TableCell>{times}</TableCell>
                <TableCell>
                  <Badge variant={service.is_active ? "default" : "secondary"}>
                    {service.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {service.is_popular && <Badge variant="secondary">Popular</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowActions(showActions === service.id ? null : service.id)}>
                      Manage
                    </Button>
                    {showActions === service.id && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export const ServicesTable = memo(ServicesTableComponent)

