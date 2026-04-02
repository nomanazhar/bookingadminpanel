"use client";

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useRef } from "react"
import type { Profile } from "@/types"

export default function NavbarWrapper() {
  // ALL hooks must come before any conditional returns — React rules of hooks
  const pathname = usePathname() ?? ""
  const [profile, setProfile] = useState<Profile | null>(null)
  const lastProfile = useRef<Profile | null>(null)
  const initialized = useRef(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function loadProfile() {
      if (!initialized.current) setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        const authUser = userData?.user ?? null
        if (!mounted) return
        if (!authUser) {
          lastProfile.current = null
          setProfile(null)
          setLoading(false)
          initialized.current = true
          return
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()
        if (!mounted) return
        const resolved = (prof as Profile) ?? null
        lastProfile.current = resolved
        setProfile(resolved)
      } catch {
        if (mounted) setProfile(lastProfile.current)
      } finally {
        if (mounted) {
          setLoading(false)
          initialized.current = true
        }
      }
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mounted) loadProfile()
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Admin layout (admin-dashboard/layout.tsx) renders its own <AdminNavbar>.
  // Return null here so there is never a second navbar on admin pages.
  if (
  pathname.startsWith("/admin-dashboard") || 
  pathname.startsWith("/admin-services") || 
  pathname.startsWith("/categories") || 
  pathname.startsWith("/orders") || 
  pathname.startsWith("/doctors") || 
  pathname.startsWith("/reviews") || 
  pathname.startsWith("/legacy-orders") || 
  pathname.startsWith("/searchbooking") || 
  pathname.startsWith("/doctors") || 
  pathname.startsWith("/users") ||
 pathname.startsWith("/calendar-view")) {
    return null
  }

  // Silent height placeholder while fetching — no spinner, no layout shift
  if (loading) {
    return (
      <div style={{
        height: 64,
        borderBottom: "1px solid hsl(var(--border))",
        background: "hsl(var(--background))",
      }} />
    )
  }

  // Customer-facing navbar only
  return <Navbar user={profile} />
}