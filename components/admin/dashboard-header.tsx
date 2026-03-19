"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import LocationsManager from "@/components/admin/locations-manager"

interface DashboardHeaderProps {
  role: "admin" | "doctor"
}

export function DashboardHeader({ role }: DashboardHeaderProps) {
  const [locationsManagerOpen, setLocationsManagerOpen] = useState(false)

  if (role === "doctor") return null

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocationsManagerOpen(true)}
          className="gap-2 p-4"
        >
          <MapPin className="h-4 w-4 " />
          Manage Locations
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">Welcome to your admin dashboard</p>

      <LocationsManager
        open={locationsManagerOpen}
        onOpenChange={setLocationsManagerOpen}
      />
    </>
  )
}
