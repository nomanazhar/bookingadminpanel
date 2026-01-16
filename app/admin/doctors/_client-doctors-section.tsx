"use client";

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import type { Doctor } from "@/types"

export default function ClientDoctorsSection({ initialDoctors }: { initialDoctors: Doctor[] | { error: string } }) {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>(Array.isArray(initialDoctors) ? initialDoctors : [])
  // Initialize error state from props - compute once during initialization using lazy initializer
  const [tableError, setTableError] = useState<string | null>(() => {
    if (!Array.isArray(initialDoctors) && 'error' in initialDoctors) {
      return initialDoctors.error || "The doctors table does not exist. Please run the database migration."
    }
    return null
  })
  
  const refreshDoctors = useCallback(async () => {
    setTableError(null)
    const res = await fetch("/api/doctors")
    if (res.ok) {
      const data = await res.json()
      if (data.error && data.error.includes("does not exist")) {
        setTableError("The doctors table does not exist. Please run the database migration.")
      } else {
        setDoctors(data)
      }
    } else {
      const error = await res.json()
      if (error.error && error.error.includes("does not exist")) {
        setTableError("The doctors table does not exist. Please run the database migration.")
      }
    }
  }, [])
  
  const handleEdit = (doctor: Doctor) => {
    router.push(`/admin/doctors/${doctor.id}/edit`)
  }
  
  const handleDelete = async (doctor: Doctor) => {
    if (!window.confirm(`Delete doctor "${doctor.first_name} ${doctor.last_name}"?`)) return
    const res = await fetch(`/api/doctors/${doctor.id}`, { method: "DELETE" })
    if (res.ok) {
      setDoctors(doctors.filter((d) => d.id !== doctor.id))
    } else {
      const error = await res.json()
      alert(`Error deleting doctor: ${error.error || "Unknown error"}`)
    }
  }
  
  // Refresh when returning from new/edit pages
  useEffect(() => {
    const handleFocus = () => {
      refreshDoctors()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshDoctors])
  
  // Show error message if table doesn't exist
  if (tableError || (!Array.isArray(initialDoctors) && 'error' in initialDoctors)) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-950 p-8">
        <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
          Database Setup Required
        </h3>
        <p className="text-red-700 dark:text-red-300 mb-4">
          The doctors table does not exist in your database. Please run the database migration before using this feature.
        </p>
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-2 text-foreground">To fix this:</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Ask someone with Supabase dashboard access to help you</li>
            <li>Open Supabase Dashboard → SQL Editor</li>
            <li>Run the SQL from <code className="bg-muted px-2 py-1 rounded">doctors_table.sql</code> file</li>
            <li>Or see the doctors section in <code className="bg-muted px-2 py-1 rounded">SUPABASE_CONSOLIDATED.sql</code></li>
            <li>See <code className="bg-muted px-2 py-1 rounded">DOCTORS_TABLE_SETUP.md</code> for detailed instructions</li>
          </ol>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Refresh Page After Migration
        </button>
      </div>
    )
  }
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {Array.isArray(doctors) && doctors.length > 0 
            ? `${doctors.length} doctor${doctors.length === 1 ? '' : 's'} found`
            : 'No doctors yet'
          }
        </p>
        <Link href="/admin/doctors/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Doctor
          </Button>
        </Link>
      </div>
      
      {Array.isArray(doctors) && doctors.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">No doctors found.</p>
          <Link href="/admin/doctors/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Doctor
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full bg-card">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Avatar
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Specialization
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                  Bio
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                  Active
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">
                  Manage
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(doctors) && doctors.map((doctor) => (
                <tr 
                  key={doctor.id} 
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    {doctor.avatar_url ? (
                      <Image 
                        src={doctor.avatar_url} 
                        alt={`${doctor.first_name} ${doctor.last_name}`} 
                        width={48} 
                        height={48} 
                        className="object-cover rounded-full border border-border" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                        <span className="text-lg font-semibold text-muted-foreground">
                          {doctor.first_name[0]}{doctor.last_name[0]}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {doctor.first_name} {doctor.last_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doctor.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doctor.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doctor.specialization || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {doctor.bio || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground">
                    {doctor.is_active ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                          Manage
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(doctor)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(doctor)} 
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

