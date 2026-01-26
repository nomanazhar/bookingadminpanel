import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/admin/orders-table"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"

async function getDoctor(doctorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", doctorId)
    .single()

  if (error || !data) {
    return null
  }
  return data
}

async function OrdersListByDoctor({ doctorId, page }: { doctorId: string; page: number }) {
  const supabase = await createClient()
  const start = (page - 1) * 20
  const end = start + 19

  const { data, error, count } = await supabase
    .from("orders")
    .select(`
      *,
      service:services(
        *,
        category:categories(*)
      ),
      customer:profiles(*),
      doctor:doctors(*)
    `, { count: 'exact' })
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .range(start, end)

  if (error) {
    console.error("Error fetching orders:", error)
    return (
      <OrdersTable 
        orders={[]} 
        currentPage={page} 
        totalCount={0} 
        pageSize={20} 
      />
    )
  }

  return (
    <OrdersTable 
      orders={(data || []) as any} 
      currentPage={page} 
      totalCount={count || 0} 
      pageSize={20} 
    />
  )
}

export default async function DoctorOrdersPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ doctorId: string }>
  searchParams?: Promise<{ page?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const doctorId = resolvedParams.doctorId
  const page = parseInt(resolvedSearchParams?.page || "1", 10) || 1

  const doctor = await getDoctor(doctorId)

  if (!doctor) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">
            Bookings - Dr. {doctor.first_name} {doctor.last_name}
          </h1>
          <p className="text-muted-foreground">View all bookings for this doctor</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Bookings for Dr. {doctor.first_name} {doctor.last_name}</CardTitle>
            <Link href={`/admin/orders/new?doctor_id=${doctorId}`}>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
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
            <OrdersListByDoctor doctorId={doctorId} page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

