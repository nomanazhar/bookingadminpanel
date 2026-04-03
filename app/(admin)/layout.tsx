import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminNavbar } from "@/components/layout/admin-navbar"
import { getCurrentUserWithProfile } from "@/lib/supabase/auth"


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, supabase } = await getCurrentUserWithProfile();

  let allowedPages: string[] | null = null
  if (profile?.role === 'doctor') {
    try {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('allowed_admin_pages')
        .eq('email', profile.email)
        .single()
      allowedPages = Array.isArray(doctor?.allowed_admin_pages) ? doctor.allowed_admin_pages : []
    } catch {
      allowedPages = null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden " style={{ width: '100%' }}>
      <AdminSidebar profile={profile} allowedPages={allowedPages} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminNavbar user={profile} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10">
          {children}
        </main>
      </div>
      
    </div>
  );
}

