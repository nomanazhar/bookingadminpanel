

"use client";

import { useState, useSyncExternalStore } from "react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import Image from 'next/image'
import { ServiceForm } from "@/components/admin/service-form"
import type { Category, ServiceWithCategory } from "@/types"



export default function ClientServicesSection({ categories }: { categories: Category[] }) {
  // External store for services
  function subscribe() {
    // No real-time updates, so just a dummy unsubscribe
    return () => {}
  }
  async function getServicesSnapshot() {
    const res = await fetch("/api/services")
    if (res.ok) return await res.json()
    return []
  }
  
  // useSyncExternalStore expects synchronous getSnapshot, so we use a workaround
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  // Remove showActions, handled by DropdownMenu
  useSyncExternalStore(
    subscribe,
    () => services,
    () => services
  )
  // Initial fetch
  useState(() => {
    getServicesSnapshot().then(setServices)
  })
  const [editService, setEditService] = useState<ServiceWithCategory | undefined>(undefined)

  // Removed useEffect, replaced with useSyncExternalStore and initial fetch

  const refreshServices = async () => {
    const res = await fetch("/api/services")
    if (res.ok) setServices(await res.json())
  }

  const handleServiceSaved = () => {
    setEditService(undefined)
    refreshServices()
  }

  const handleEdit = (service: ServiceWithCategory) => {
    setEditService(service)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (service: ServiceWithCategory) => {
    if (!window.confirm(`Delete service \"${service.name}\"?`)) return
    const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" })
    if (res.ok) {
      setServices(services.filter((s) => s.id !== service.id))
    }
  }

  const handleCancelEdit = () => {
    setEditService(undefined)
  }

  return (
    <>
      <div className="mb-8">
        <ServiceForm 
          onServiceSaved={handleServiceSaved} 
          initialValues={editService} 
          categories={categories}
          onCancel={handleCancelEdit}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full bg-card">
          <thead className="bg-muted/50">
            <tr className="bg-[#333333] text-white">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Image</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Price</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Duration</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Sessions</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Available Times</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Subtreatments</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Active</th>
              {/* <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Popular</th> */}
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Manage</th>
            </tr>
          </thead>
          <tbody>
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
              // Render subtreatments (subservices) as name with price in small text (React, not HTML string)
              const subtreatments = Array.isArray(service.subservices) && service.subservices.length > 0
                ? service.subservices.map((s: any, i: number) => {
                    const raw = typeof s.price === 'number' ? s.price : (s.price ? parseFloat(s.price) : 0)
                    const price = Number.isFinite(raw) ? raw : 0
                    return (
                      <span key={i} className="block">
                        {s.name}
                        <span className="text-xs text-muted-foreground ml-1">£{price.toFixed(2)}</span>
                      </span>
                    )
                  })
                : "-";
              return (
                <tr key={service.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{service.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{categories.find((c) => c.id === service.category_id)?.name || '-'}</td>
                  <td className="px-4 py-3 text-foreground">{service.thumbnail ? <Image src={service.thumbnail} alt="thumb" width={48} height={48} className="rounded object-cover" /> : "-"}</td>
                  <td className="px-4 py-3 text-foreground">£{service.base_price}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{service.description || "-"}</td>
                  <td className="px-4 py-3 text-foreground">{service.duration_minutes || "-"} min</td>
                  <td className="px-4 py-3 text-foreground text-sm">{sessions}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{times}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{subtreatments}</td>
                  <td className="px-4 py-3 text-center text-foreground">{service.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-center text-foreground hidden">{service.is_popular ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-center relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span className="cursor-pointer text-gray-500 hover:text-black" title="Manage">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19.5" cy="12" r="1.5" />
                            <circle cx="4.5" cy="12" r="1.5" />
                          </svg>
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(service)} className="text-blue-600">Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(service)} className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
