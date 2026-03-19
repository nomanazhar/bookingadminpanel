import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadAdminDashboardData } from "@/lib/supabase/queries"
import { getCurrentUserAndRole } from "@/lib/supabase/auth"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { DashboardHeader } from "@/components/admin/dashboard-header"
import { Users, ShoppingCart, FolderTree, Sparkles } from "lucide-react"
import type { OrderWithDetails } from "@/types"

function StatsCards({
  role,
  stats,
  futureAppointments,
}: {
  role: "admin" | "doctor"
  stats: {
    totalCustomers: number
    totalOrders: number
    totalCategories: number
    totalServices: number
    totalDoctors: number
  }
  futureAppointments: number
}) {
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
      title: "Total Therapists",
      value: stats.totalDoctors,
      icon: Users,
      description: "Active therapists",
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

function RecentOrders({ orders }: { orders: OrderWithDetails[] }) {
  return <RecentOrdersTable orders={orders} />
}

export default async function AdminDashboard() {
  const [{ stats, futureAppointments, recentOrders }, { user, role: resolvedRole }] =
    await Promise.all([loadAdminDashboardData(5), getCurrentUserAndRole()])

  const role: "admin" | "doctor" =
    user && resolvedRole === "doctor" ? "doctor" : "admin"

  return (
    <div className="p-6 space-y-6">
      <DashboardHeader role={role} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCards
          role={role}
          stats={stats}
          futureAppointments={futureAppointments}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentOrders orders={recentOrders} />
        </CardContent>
      </Card>
    </div>
  )
}

