

"use client";
import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Profile } from "@/types"

export default function NavbarWrapper() {
  const pathname = usePathname() || "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // List all admin route prefixes here
  const adminPrefixes = [
    "/admin",
    "/(admin)",
    "/admin-dashboard",
    "/admin-services",
    "/categories",
    "/doctors",
    "/orders",
    "/users",
    "/searchbooking",
    "/legacy-orders",
    // Add more as needed
  ];

  const isAdminRoute = adminPrefixes.some(prefix => pathname.startsWith(prefix));

  useEffect(() => {
    if (isAdminRoute) return;
    let mounted = true;
    const supabase = createClient();

    async function loadProfile() {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData?.user || null;
        if (!mounted) return;
        if (!authUser) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();
        if (!mounted) return;
        setProfile(prof || null);
        setLoading(false);
      } catch (e) {
        if (mounted) setProfile(null);
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [pathname, isAdminRoute]);

  if (isAdminRoute) return null;
  if (loading) {
    // You can replace this with a skeleton or spinner if you want
    return <div style={{height: 64}}></div>;
  }
  return <Navbar user={profile} />;
}
