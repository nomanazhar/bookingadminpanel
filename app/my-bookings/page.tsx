// removed unused Button and RefreshCcw imports
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByCustomer } from "@/lib/supabase/queries";
import { parseBookingDateTime } from '@/lib/utils'
import type { Profile } from "@/types";
import MyBookingsClient from "@/components/bookings/my-bookings-client";

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user || null

  let user: Profile | null = null
  let orders: any[] = []
  if (authUser) {
  const profilePromise = supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()
  const ordersPromise = getOrdersByCustomer(supabase, authUser.id)

  const [profileRes, fetched] = await Promise.all([profilePromise, ordersPromise])
  user = (profileRes.data as Profile) || null
  orders = fetched || []
}

  function toDate(o: any) {
    return parseBookingDateTime(o.booking_date, o.booking_time || '00:00:00')
  }

  const now = new Date()
  // All upcoming orders (status pending|confirmed) where the booking datetime is >= now
  const upcoming = orders
    .filter((o: any) => (o.status === 'pending' || o.status === 'confirmed') && toDate(o) >= now)
    .sort((a: any, b: any) => toDate(a).getTime() - toDate(b).getTime())

  const previous = orders.filter((o: any) => !(o.status === 'pending' || o.status === 'confirmed') || toDate(o) < now)
  previous.sort((a: any, b: any) => toDate(b).getTime() - toDate(a).getTime())

  function formatDate(dateStr: string) {
    try {
      const d = parseBookingDateTime(dateStr, '00:00:00')
      return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <>
      <main className="container mx-auto py-8">
        <section className="max-w-3xl mx-auto mb-10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Link href="/book-consultation" className="text-muted-foreground text-base font-normal cursor-pointer">Go back</Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">My Bookings</h1>
        </section>

        {authUser && (
          <MyBookingsClient customerId={authUser.id} />
        )}
      </main>
    </>
  )
}
