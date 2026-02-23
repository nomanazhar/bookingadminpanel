"use client"
import React, { useReducer, useState } from "react"
import useSWR from 'swr'
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import RescheduleSessionDialog from "./RescheduleSessionDialog"
import { parseBookingDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

function tabReducer(state: { activeTab: "Upcoming" | "Previous" }, action: { type: "SET_TAB"; tab: "Upcoming" | "Previous" }) {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab }
    default:
      return state
  }
}




interface Props {
  customerId: string;
}

export default function MyBookingsClient({ customerId }: Props) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<any>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [state, dispatch] = useReducer(tabReducer, { activeTab: "Upcoming" });
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  // SWR fetcher for bookings
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: orders, isLoading, error, mutate } = useSWR(
    customerId ? `/api/orders/customer/${customerId}` : null,
    fetcher,
    { refreshInterval: 10000 } // Poll every 10s for real-time updates
  );

  // Debug panel (only show in development)
  const isDev = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production';

  function formatDate(dateStr: string) {
    try {
      const d = parseBookingDateTime(dateStr, '00:00:00');
      return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // Helper to show session progress (e.g., 1/3, 2/3)
  function renderSessionProgress(order: OrderWithDetails) {
    let current = 1;
    let total = 1;
    if (Array.isArray(order.sessions) && order.sessions.length > 0) {
      // Sort sessions by session_number ascending
      const sortedSessions = [...order.sessions].sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
      total = sortedSessions.length;
      const nextSessionIdx = sortedSessions.findIndex(s => s.status === 'pending' || s.status === 'scheduled');
      current = nextSessionIdx >= 0 ? nextSessionIdx + 1 : total;
    } else {
      total = order.session_count || 1;
      current = 1;
    }
    return (
      <div className="text-xs font-semibold text-primary mb-2">
        Session {current} of {total}
      </div>
    );
  }

  const now = new Date();
  // Card stays in Upcoming if any session is pending/scheduled; moves to Previous only if all sessions are completed/cancelled/expired or order is not pending/confirmed
  function allSessionsDone(sessions: any[] | undefined) {
    if (!Array.isArray(sessions) || sessions.length === 0) return false;
    return sessions.every(s => ['completed', 'cancelled', 'expired', 'missed'].includes(s.status));
  }

  const upcoming = (orders as OrderWithDetails[] || [])
    .filter((o) => {
      const sessionsDone = allSessionsDone(o.sessions);
      return (o.status === 'pending' || o.status === 'confirmed') && !sessionsDone && parseBookingDateTime(o.booking_date, o.booking_time || '00:00:00') >= now;
    })
    .sort((a, b) => parseBookingDateTime(a.booking_date, a.booking_time || '00:00:00').getTime() - parseBookingDateTime(b.booking_date, b.booking_time || '00:00:00').getTime());


  // Previous sessions: flatten all completed sessions from all orders
  const previousSessions = (orders as OrderWithDetails[] || [])
    .flatMap(order => {
      if (!Array.isArray(order.sessions)) return [];
      return order.sessions
        .filter(s => s.status === 'completed')
        .map(s => ({ order, session: s }));
    })
    .sort((a, b) => {
      // Sort by session attended_date or scheduled_date descending
      const dateA = a.session.attended_date || a.session.scheduled_date || '';
      const dateB = b.session.attended_date || b.session.scheduled_date || '';
      return dateB.localeCompare(dateA);
    });


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[180px]">Loading bookings...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-[180px] text-red-500">Failed to load bookings.</div>;
  }

  return (
    <>
      {isDev && (
        <div style={{ background: '#f5f5f5', color: '#222', padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 12 }}>
          <strong>Debug Info (dev only):</strong>
          <div><b>customerId:</b> {customerId}</div>
          <div><b>orders (raw):</b> <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(orders, null, 2)}</pre></div>
        </div>
      )}
      <section className="max-w-3xl mx-auto mb-8">
        <div className="flex w-full rounded-full overflow-hidden bg-muted p-2">
          <button
            className={`flex-1 py-4 text-lg font-medium rounded-full transition ${
              state.activeTab === "Upcoming" ? "bg-background shadow" : "text-muted-foreground"
            }`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "Upcoming" })}
          >
            Upcoming
          </button>
          <button
            className={`flex-1 py-4 text-lg font-medium rounded-full transition ${
              state.activeTab === "Previous" ? "bg-background shadow" : "text-muted-foreground"
            }`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "Previous" })}
          >
            Previous
          </button>
        </div>
      </section>

      {state.activeTab === "Upcoming" ? (
        <section className="max-w-3xl mx-auto">
          {upcoming.length === 0 ? (
            <div className="bg-muted rounded-xl shadow p-8 min-h-[180px] flex items-center justify-center">
              <span className="text-lg text-muted-foreground">No upcoming bookings.</span>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming ({upcoming.length})</h2>
              </div>
              {upcoming.map((upcomingOrder: OrderWithDetails, idx: number) => {
                // Find the next session (pending or scheduled)
                const sortedSessions = Array.isArray(upcomingOrder.sessions)
                  ? [...upcomingOrder.sessions].sort((a, b) => (a.session_number || 0) - (b.session_number || 0))
                  : [];
                const nextSession = sortedSessions.find(s => s.status === 'pending' || s.status === 'scheduled');
                const hasDate = nextSession && nextSession.scheduled_date && nextSession.scheduled_time;
                return (
                  <section key={idx} className="bg-muted rounded-xl shadow p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <span className="inline-block bg-[#7B61FF] text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">Upcoming</span>
                      </div>
                      {renderSessionProgress(upcomingOrder)}
                      <h2 className="text-2xl font-bold mb-1">
                        {hasDate
                          ? formatDate(nextSession.scheduled_date ?? upcomingOrder.booking_date)
                          : 'Reschedule to book new session'}
                      </h2>
                      <div className="text-muted-foreground text-sm mb-2 capitalize">{upcomingOrder.service?.category?.name || ''}</div>
                      <div className="text-lg font-medium mb-1 capitalize">{upcomingOrder.service_title}</div>
                      <div className="text-muted-foreground text-sm mb-4 capitalize">{upcomingOrder.customer?.first_name} {upcomingOrder.customer?.last_name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-4 min-w-[180px] mt-4 md:mt-0">
                      <div className="text-base font-semibold text-right">
                        {hasDate
                          ? (() => {
                              const startDt = parseBookingDateTime(
                                nextSession.scheduled_date ?? upcomingOrder.booking_date,
                                typeof nextSession.scheduled_time === 'string' && nextSession.scheduled_time ? nextSession.scheduled_time : '00:00:00'
                              );
                              let label = startDt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                              if (upcomingOrder.service?.duration_minutes) {
                                const end = new Date(startDt.getTime() + upcomingOrder.service.duration_minutes * 60000);
                                let hour = end.getHours();
                                const minute = end.getMinutes().toString().padStart(2, '0');
                                const ampm = hour >= 12 ? 'pm' : 'am';
                                hour = hour % 12;
                                if (hour === 0) hour = 12;
                                label = `${label} - ${hour}:${minute} ${ampm}`;
                              }
                              return label;
                            })()
                          : '--:--'}
                      </div>
                      <div className="flex gap-2 bottom-4">
                        <Button
                          variant="ghost"
                          className="border border-input bg-background hover:bg-red-500 capitalize"
                          disabled={cancellingId === upcomingOrder.id}
                          onClick={async () => {
                            if (!upcomingOrder.id) return;
                            if (!window.confirm('Are you sure you want to cancel this booking?')) return;
                            setCancellingId(upcomingOrder.id);
                            try {
                              const res = await fetch(`/api/orders/${upcomingOrder.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                mutate();
                              } else {
                                alert('Failed to cancel booking.');
                              }
                            } catch {
                              alert('Failed to cancel booking.');
                            } finally {
                              setCancellingId(null);
                            }
                          }}
                        >
                          {cancellingId === upcomingOrder.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                        {nextSession && !hasDate ? (
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => {
                              setRescheduleSession(nextSession);
                              setRescheduleOpen(true);
                            }}
                          >
                            Book Next Session
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => {
                              setRescheduleSession(nextSession);
                              setRescheduleOpen(true);
                            }}
                          >
                            <RefreshCcw className="w-4 h-4 mr-1" /> Reschedule
                          </Button>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
              {/* Reschedule/Book Next Session Dialog */}
              <RescheduleSessionDialog
                open={rescheduleOpen}
                onClose={() => setRescheduleOpen(false)}
                onSubmit={async (date, time) => {
                  if (!rescheduleSession) return;
                  setRescheduleLoading(true);
                  try {
                    const res = await fetch(`/api/orders/${rescheduleSession.order_id}/sessions`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId: rescheduleSession.id, scheduled_date: date, scheduled_time: time })
                    });
                    if (res.ok) {
                      mutate();
                      setRescheduleOpen(false);
                    } else {
                      alert('Failed to update session.');
                    }
                  } catch {
                    alert('Failed to update session.');
                  } finally {
                    setRescheduleLoading(false);
                  }
                }}
                session={rescheduleSession}
                loading={rescheduleLoading}
              />
            </>
          )}
        </section>
      ) : (
        <section className="max-w-3xl mx-auto bg-muted rounded-xl shadow p-8 min-h-[180px]">
          {previousSessions.length === 0 ? (
            <div className="flex items-center justify-center min-h-[180px]">
              <span className="text-lg text-muted-foreground">You have no previous sessions.</span>
            </div>
          ) : (
            previousSessions.map(({ order, session }, idx) => (
              <div key={session.id} className="bg-white rounded-xl shadow p-6 flex items-center gap-6 mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-primary mb-2">Session {session.session_number} of {order.session_count}</div>
                  <h3 className="font-semibold">{formatDate(session.attended_date || session.scheduled_date || order.booking_date)}</h3>
                  <div className="text-muted-foreground text-sm">{order.service_title}</div>
                  <div className="text-muted-foreground text-sm">{order.customer?.first_name} {order.customer?.last_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {(() => {
                      const startDt = parseBookingDateTime(session.scheduled_date || order.booking_date, session.scheduled_time || order.booking_time || '00:00:00');
                      let label = startDt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                      if (order.service?.duration_minutes) {
                        const end = new Date(startDt.getTime() + order.service.duration_minutes * 60000);
                        let hour = end.getHours();
                        const minute = end.getMinutes().toString().padStart(2, '0');
                        const ampm = hour >= 12 ? 'pm' : 'am';
                        hour = hour % 12;
                        if (hour === 0) hour = 12;
                        label = `${label} - ${hour}:${minute} ${ampm}`;
                      }
                      return label;
                    })()}
                  </div>
                  <div className="text-sm text-muted-foreground">completed</div>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </>
  )
}
