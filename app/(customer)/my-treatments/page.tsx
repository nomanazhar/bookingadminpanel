// app/my-treatments/page.tsx   ← or similar path

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByCustomer } from "@/lib/supabase/queries";
import { parseBookingDateTime } from "@/lib/utils";
import type { Profile } from "@/types";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function MyTreatmentsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let user: Profile | null = null;
  let orders: any[] = [];

  if (authUser) {
    const [profileRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", authUser.id).single(),
      getOrdersByCustomer(supabase, authUser.id),
    ]);

    user = profileRes.data as Profile ?? null;
    orders = ordersRes ?? [];
  }

  // Show both completed and upcoming treatments
  const now = new Date();
  const treatments = orders
    .filter((o: any) =>
      o.status === "completed" ||
      ((o.status === "pending" || o.status === "confirmed") && parseBookingDateTime(o.booking_date, o.booking_time ?? "00:00:00") >= now)
    )
    .sort((a: any, b: any) => {
      const ad = parseBookingDateTime(a.booking_date, a.booking_time ?? "00:00:00");
      const bd = parseBookingDateTime(b.booking_date, b.booking_time ?? "00:00:00");
      return bd.getTime() - ad.getTime(); // newest first
    });

  return (
    <main className="container mx-auto py-8">
      <section className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          <Link
            href="/book-consultation"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Go back
          </Link>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">My Treatments</h1>
      </section>

      <section className="max-w-3xl mx-auto mb-8">
        <div className="flex w-full rounded-full overflow-hidden bg-muted p-1.5">
          <div className="flex-1 py-3.5 px-6 text-center text-lg font-medium bg-background rounded-full shadow">
            Purchased
          </div>
        </div>
      </section>

      {/* Treatments: Upcoming and Completed */}
      <section className="max-w-4xl mx-auto space-y-4">
        {treatments.length === 0 ? (
          <div className="bg-muted/60 rounded-xl shadow-sm p-10 text-center min-h-[200px] flex items-center justify-center">
            <p className="text-lg text-muted-foreground">
              You have not purchased or booked any treatments yet.
            </p>
          </div>
        ) : (
          treatments.map((order: any) => {
            const bookingDateTime = parseBookingDateTime(
              order.booking_date,
              order.booking_time ?? "00:00:00"
            );
            let statusLabel = "";
            let statusColor = "";
            if (order.status === "completed") {
              statusLabel = "Completed";
              statusColor = "text-emerald-600";
            } else if (order.status === "pending") {
              statusLabel = "Upcoming";
              statusColor = "text-blue-600";
            } else if (order.status === "confirmed") {
              statusLabel = "Confirmed";
              statusColor = "text-blue-700";
            }
            return (
              <div
                key={order.id}
                className="bg-white border rounded-xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow transition-shadow"
              >
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg">
                    {formatDate(order.booking_date)}
                  </h3>
                  <div className="text-muted-foreground">
                    {order.service_title}
                  </div>
                  {order.customer && (
                    <div className="text-sm text-muted-foreground">
                      {order.customer.first_name} {order.customer.last_name}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="font-medium">
                    {bookingDateTime.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                  <div className={`text-sm font-medium capitalize ${statusColor}`}>
                    {statusLabel}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}