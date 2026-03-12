import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { AdminNavbar } from "@/components/layout/admin-navbar"
import { getCurrentUserWithProfile } from "@/lib/supabase/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getCurrentUserWithProfile();
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
  );
}

