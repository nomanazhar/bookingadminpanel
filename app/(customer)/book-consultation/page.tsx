import { Button } from "@/components/ui/button";
import { CalendarDays, ShoppingBag, Settings, ChevronRight } from "lucide-react";
// removed unused dynamic import
import UpcomingClient from '@/components/bookings/UpcomingClient'
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByCustomer } from "@/lib/supabase/queries";
import { parseBookingDateTime } from '@/lib/utils'
import type { Profile } from "@/types";

export default async function BookConsultationPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user || null

  // Fetch the profile row from the `profiles` table so we can pass a `Profile | null`
  let upcoming: any = null
  if (authUser) {
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    const ordersPromise = getOrdersByCustomer(supabase, authUser.id)

    const [profileRes, orders] = await Promise.all([profilePromise, ordersPromise])
    // use local `orders` variable returned from the query

    if (orders && orders.length) {
      const now = new Date()
      const candidates = orders.filter((o: any) => {
        const dt = parseBookingDateTime(o.booking_date, o.booking_time || '00:00:00')
        return (o.status === 'pending' || o.status === 'confirmed') && dt >= now
      })
      candidates.sort((a: any, b: any) => {
        const ad = parseBookingDateTime(a.booking_date, a.booking_time || '00:00:00')
        const bd = parseBookingDateTime(b.booking_date, b.booking_time || '00:00:00')
        return ad.getTime() - bd.getTime()
      })
      upcoming = candidates[0]
    }
  }

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
        
        {/* Account Greeting Section */}
        <section className="max-w-3xl mx-auto mb-10 ">
          <div className="mb-2">
          <Link href="/">
            <Button variant="ghost">← Back to Dashboard</Button>
          </Link>
        </div>
          <div className="mb-2 text-muted-foreground text-base font-normal">Good evening</div>
          <div className="flex items-center justify-between"> 
            <h1 className="text-4xl font-bold tracking-tight">My Account</h1>
            {!authUser && (
              <p >To see your bookings SignIn</p>
            )}
          </div>
          
        </section>
       
        {/* Upcoming Appointment Section */}
        <section className="bg-muted rounded-xl shadow-md p-6 md:p-8 max-w-3xl mx-auto border border-1">
          {upcoming ? (
            <UpcomingClient
              booking_date={upcoming.booking_date}
              booking_time={upcoming.booking_time}
              service={upcoming.service}
              service_title={upcoming.service_title}
              customer={upcoming.customer}
              orderId={upcoming.id}
            />
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-1">No upcoming appointments</h2>
                <div className="text-muted-foreground text-sm mb-2">You have no upcoming bookings.</div>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
               <Link href="/dashboard"><Button variant="ghost" className="border border-input bg-background hover:bg-muted">Book now</Button></Link>
              </div>
            </div>
          )}
        </section>
        {/* Manage Section */}
        <section className="max-w-3xl mx-auto mt-10  shadow-md rounded-xl  ">
          <h2 className="text-xl font-bold mb-4">Manage</h2>
          <div className="bg-muted rounded-xl shadow divide-y">
            <Link href="/my-bookings" className="flex items-center px-6 py-5 gap-4 hover:bg-white hover:text-black transition cursor-pointer">
              <span className="bg-muted p-2 rounded-full"><CalendarDays className="w-6 h-6 text-primary" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg">My Bookings</div>
                <div className="text-muted-foreground text-sm">Manage your upcoming appointments and history</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Link href="/my-treatments" className="flex items-center px-6 py-5 gap-4 hover:bg-white hover:text-black transition cursor-pointer">
              <span className="bg-muted p-2 rounded-full"><ShoppingBag className="w-6 h-6 text-primary" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg">My Treatments</div>
                <div className="text-muted-foreground text-sm">Browse and book available treatments</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Link href="/order-history" className="flex items-center px-6 py-5 gap-4 hover:bg-white hover:text-black transition cursor-pointer">
              <span className="bg-muted p-2 rounded-full"><ShoppingBag className="w-6 h-6 text-primary" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg ">My Order History</div>
                <div className="text-muted-foreground text-sm">Manage recent Bookings and view previous purchases</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Link href="/profile/settings" className="flex items-center px-6 py-5 gap-4 hover:bg-white hover:text-black transition cursor-pointer rounded-b-xl">
              <span className="bg-muted p-2 rounded-full"><Settings className="w-6 h-6 text-primary" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg ">Profile Settings</div>
                <div className="text-muted-foreground text-sm">Manage your account information</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
