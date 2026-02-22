// app/(customer)/my-treatments/MyTreatmentsClient.tsx

"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const RescheduleSessionDialog = dynamic(
  () => import("@/components/bookings/RescheduleSessionDialog"),
  { ssr: false }
);

import { calculateSessionProgress } from "@/lib/supabase/queries";

type Session = any; // ← improve with real type when possible
type Order = any;

type Props = {
  treatments: Order[];
  orderSessions: Record<string, Session[]>;
  formatDate: (dateStr: string) => string;
};

export default function MyTreatmentsClient({
  treatments,
  orderSessions,
  formatDate,
}: Props) {
  // Defensive: ensure treatments and orderSessions are always defined
  const safeTreatments = Array.isArray(treatments) ? treatments : [];
  const safeOrderSessions = orderSessions && typeof orderSessions === 'object' ? orderSessions : {};
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReschedule = (session: Session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleRescheduleSubmit = async (date: string, time: string) => {
    if (!selectedSession) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${selectedSession.order_id}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          scheduled_date: date,
          scheduled_time: time,
          status: "scheduled",
        }),
      });

      if (!res.ok) throw new Error("Failed to reschedule");

      setDialogOpen(false);
      setSelectedSession(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to reschedule session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <main className="container mx-auto py-8">
    <section className="max-w-3xl mx-auto mb-10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Link href="/book-consultation" className="text-muted-foreground text-base font-normal cursor-pointer">Go back</Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">My Treatments</h1>
        </section>
      <section className="max-w-4xl mx-auto space-y-4">
        {safeTreatments.length === 0 ? (
          <div className="bg-muted/60 rounded-xl shadow-sm p-10 text-center min-h-[200px] flex items-center justify-center">
            <p className="text-lg text-muted-foreground">
              You have not purchased or booked any treatments yet.
            </p>
          </div>
        ) : (
          safeTreatments.map((order: Order) => {
            const bookingDateTime = new Date(`${order.booking_date}T${order.booking_time ?? "00:00:00"}`);
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

            const sessions = safeOrderSessions[order.id] || [];
            const progress = calculateSessionProgress(sessions); // assuming this is exported & works

            return (
              <div
                key={order.id}
                className="bg-white border rounded-xl shadow-sm p-5 sm:p-6 flex flex-col gap-2 hover:shadow transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      {(() => {
                        let label = bookingDateTime.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });
                        if (order.service?.duration_minutes) {
                          const end = new Date(bookingDateTime.getTime() + order.service.duration_minutes * 60000);
                          let hour = end.getHours() % 12 || 12;
                          const minute = end.getMinutes().toString().padStart(2, "0");
                          const ampm = end.getHours() >= 12 ? "pm" : "am";
                          label = `${label} – ${hour}:${minute} ${ampm}`;
                        }
                        return label;
                      })()}
                    </div>
                    <div className={`text-sm font-medium capitalize ${statusColor}`}>
                      {statusLabel}
                    </div>
                  </div>
                </div>

                {/* Session progress and details */}
                {sessions.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {progress.attended} of {progress.total} sessions attended • {progress.remaining} remaining
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                      {sessions.map((s: Session) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div className="min-w-[140px]">
                            <span className="font-semibold">Session {s.session_number}:</span>
                          </div>
                          <div className="flex-1">
                            {s.scheduled_date
                              ? formatDate(s.scheduled_date)
                              : "Not scheduled"}{" "}
                            {s.scheduled_time ? s.scheduled_time.slice(0, 5) : ""}
                          </div>
                          <span
                            className={
                              s.status === "completed"
                                ? "text-emerald-600 font-medium"
                                : s.status === "scheduled"
                                ? "text-blue-600 font-medium"
                                : s.status === "pending"
                                ? "text-gray-500"
                                : s.status === "expired"
                                ? "text-red-500"
                                : "text-gray-400"
                            }
                          >
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>

                          {(s.status === "pending" || s.status === "scheduled") && (
                            <button
                              className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
                              onClick={() => handleReschedule(s)}
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Reschedule dialog – client-only */}
      <RescheduleSessionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleRescheduleSubmit}
        session={selectedSession}
        loading={loading}
      />
       </main>
    </>
  );
}