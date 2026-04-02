// removed unused Button and RefreshCcw imports
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MyBookingsClient from "@/components/bookings/my-bookings-client";
import { getCurrentUserWithProfile } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";

export default async function MyBookingsPage() {
  const { user } = await getCurrentUserWithProfile();
  const authUser = user || null;

  return (
    <>
      <main className="container mx-auto py-6">
        <section className="max-w-3xl mx-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            
            <Link href="/book-consultation">
              <Button variant="primary" className="h-6 w-10 "><ArrowLeft /></Button>
            </Link> 
            <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          </div>
          
        </section>

        {authUser && (
          <MyBookingsClient
            customerId={authUser.id}
          />
        )}
      </main>
    </>
  );
}
