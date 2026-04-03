"use client";

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { CreateCustomerDialog } from "@/components/admin/create-customer-dialog"
import { clearUsersClientCache } from "@/components/admin/users-client"
import type { Profile } from "@/types"

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`)
        if (!res.ok) throw new Error("Failed to fetch user")

        const data = await res.json()
        if (!data) {
          toast({
            title: "Error",
            description: "User not found",
            variant: "destructive",
          })
          router.push("/users")
          return
        }

        setUser(data)
        setOpen(true)
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load user",
          variant: "destructive",
        })
        router.push("/users")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadUser()
    }
  }, [userId, router, toast])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <CreateCustomerDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) router.push('/users')
      }}
      initialData={user}
      mode="edit"
      onSaved={async () => {
        // Clear client-side users cache then navigate back so the users list reloads fresh
        try { clearUsersClientCache() } catch {}
        router.push('/users')
      }}
    />
  )
}

