import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminNavbar } from "@/components/layout/admin-navbar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profile?.role === "doctor") {
    // Fetch allowed_admin_pages for this doctor
    const { data: doctor } = await supabase
      .from("doctors")
      .select("allowed_admin_pages")
      .eq("email", profile.email)
      .single()
    // Extract the page slug from the path
    const path = typeof window !== "undefined" ? window.location.pathname : ""
    const pageMatch = path.match(/^\/admin-dashboard\/?([^\/]*)/)
    const pageSlug = pageMatch && pageMatch[1] ? pageMatch[1] : "admin-dashboard"
    const allowedPages = doctor?.allowed_admin_pages || []
    if (pageSlug !== "admin-dashboard" && !allowedPages.includes(pageSlug)) {
      redirect("/admin-dashboard")
    }
  } else if (profile?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="flex h-screen overflow-hidden " style={{ width: '100%' }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminNavbar user={profile} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  )
}

