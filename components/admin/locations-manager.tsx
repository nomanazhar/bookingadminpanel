"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, X, Trash2, Plus } from "lucide-react"
import ConfirmDialog from "@/components/ui/confirm-dialog"

interface Location {
  id: string
  name: string
  address?: string
  city?: string
  country: string
  is_active: boolean
}

interface LocationsManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function LocationsManager({ open, onOpenChange }: LocationsManagerProps) {
  const { toast } = useToast()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "UK",
  })

  useEffect(() => {
    if (open && locations.length === 0) {
      fetchLocations()
    }
  }, [open])

  const fetchLocations = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/locations")
      if (!response.ok) throw new Error("Failed to fetch locations")
      const data = await response.json()
      setLocations(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast({
        title: "Validation",
        description: "Location name is required",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add location")
      }

      const newLocation = await response.json()
      setLocations([...locations, newLocation])
      setFormData({ name: "", address: "", city: "", country: "UK" })
      setShowAddForm(false)
      toast({
        title: "Success",
        description: "Location added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add location",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDeleteLocation = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/locations/${deletingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete location")
      }

      setLocations((prev) => prev.filter((loc) => loc.id !== deletingId))
      toast({
        title: "Success",
        description: "Location deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingId(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete location",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl rounded-2xl shadow-2xl border-0 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Manage Locations</CardTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Locations List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Locations</h3>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No locations yet. Click "Add Location" to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{location.name}</p>
                      {location.city && (
                        <p className="text-xs text-muted-foreground">
                          {location.city}, {location.country}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setDeletingId(location.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                      title="Delete location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Location Form */}
          {showAddForm && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Add New Location</h3>
              <form onSubmit={handleAddLocation} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Location Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Guildford"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium">
                      City
                    </Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-sm font-medium">
                      Country
                    </Label>
                    <Input
                      id="country"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Location"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          setDeleteDialogOpen(v)
          if (!v) setDeletingId(null)
        }}
        title="Delete location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        onConfirm={confirmDeleteLocation}
        loading={deleting}
      />
    </div>
  )
}
