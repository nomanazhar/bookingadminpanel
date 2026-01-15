"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Profile } from "@/types"

export default function NavbarWrapper() {
  const pathname = usePathname() || ""
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (pathname.startsWith("/admin")) return
    let mounted = true
    const supabase = createClient()

    async function loadProfile() {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const authUser = userData?.user || null
        if (!mounted) return
        if (!authUser) {
          setProfile(null)
          return
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()
        if (!mounted) return
        setProfile(prof || null)
      } catch (e) {
        if (mounted) setProfile(null)
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [pathname])

  if (pathname.startsWith("/admin")) return null

  return <Navbar user={profile} />
}
