"use client"
import { useEffect, useState, useMemo } from "react"

/**
 * Hook to fetch locations from the database
 * Automatically syncs whenever locations are added/removed via admin panel
 */
export function useLocations() {
  const [locations, setLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/admin/locations")
        if (!response.ok) throw new Error("Failed to fetch locations")
        const data = await response.json()
        setLocations(data.map((loc: { name: string }) => loc.name))
      } catch (error) {
        console.error("Error fetching locations:", error)
        setLocations([])
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [])

  return useMemo(() => ({ locations, loading }), [locations, loading])
}

// Fallback for backward compatibility (if needed elsewhere)
export const LOCATIONS = ["Guildford", "West Byfleet"];
 