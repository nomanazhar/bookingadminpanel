import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getStats, getRecentOrdersAdmin, getFutureAppointmentsCount } from "@/lib/supabase/queries"
import { createClient } from "@/lib/supabase/server"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { Users, ShoppingCart, FolderTree, Sparkles } from "lucide-react"

async function StatsCards() {
  const [stats, futureAppointments] = await Promise.all([
    getStats(),
    getFutureAppointmentsCount(),
  ])

  // Get user role (server-side)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let role = "admin"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile?.role) role = profile.role
  }

  // Define cards for each role
  const adminCards = [
    {
      title: "Upcoming Appointments",
      value: futureAppointments,
      icon: ShoppingCart,
      description: "Future bookings",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      description: "Registered customers",
    },
    {
      title: "Total Appointments ",
      value: stats.totalOrders,
      icon: ShoppingCart,
      description: "All time appointments",
    },
    {
      title: "Total Categories",
      value: stats.totalCategories,
      icon: FolderTree,
      description: "Active categories",
    },
    {
      title: "Total Treatments",
      value: stats.totalServices,
      icon: Sparkles,
      description: "Active treatments",
    },
    {
      title: "Total Doctors",
      value: stats.totalDoctors,
      icon: Users,
      description: "Active doctors",
    },
  ]
  const doctorCards = [
    {
      title: "Upcoming Appointments",
      value: futureAppointments,
      icon: ShoppingCart,
      description: "Your future bookings",
    },
    {
      title: "Total Appointments ",
      value: stats.totalOrders,
      icon: ShoppingCart,
      description: "All your appointments",
    },
    // Add more doctor-specific cards as needed
  ]

  const cards = role === "doctor" ? doctorCards : adminCards

  return (
    <>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </>
  )
}

async function RecentOrders() {
  const orders = await getRecentOrdersAdmin(5)
  return <RecentOrdersTable orders={orders} />
}

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your admin dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Suspense
          fallback={
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </>
          }
        >
          <StatsCards />
        </Suspense>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            }
          >
            <RecentOrders />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

