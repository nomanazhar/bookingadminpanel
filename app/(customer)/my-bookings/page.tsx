// removed unused Button and RefreshCcw imports
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MyBookingsClient from "@/components/bookings/my-bookings-client";
import { getCurrentUserWithProfile } from "@/lib/supabase/auth";

export default async function MyBookingsPage() {
  const { user } = await getCurrentUserWithProfile();
  const authUser = user || null;

  return (
    <>
      <main className="container mx-auto py-8">
        <section className="max-w-3xl mx-auto mb-10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Link
              href="/book-consultation"
              className="text-muted-foreground text-base font-normal cursor-pointer"
            >
              Go back
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">My Bookings</h1>
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
