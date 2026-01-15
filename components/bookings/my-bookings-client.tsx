"use client"
import React, { useReducer } from "react"
import useSWR from 'swr'
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import { parseBookingDateTime } from '@/lib/utils'

function tabReducer(state: { activeTab: "Upcoming" | "Previous" }, action: { type: "SET_TAB"; tab: "Upcoming" | "Previous" }) {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab }
    default:
      return state
  }
}


interface Props {
  customerId: string
}

export default function MyBookingsClient({ customerId }: Props) {
  const [state, dispatch] = useReducer(tabReducer, { activeTab: "Upcoming" })
  const fetcher = (url: string) => fetch(url).then(res => res.json())
  const { data, error, isLoading } = useSWR(`/api/orders/customer/${encodeURIComponent(customerId)}`, fetcher, { refreshInterval: 5000 })

  function formatDate(dateStr: string) {
    try {
      const d = parseBookingDateTime(dateStr, '00:00:00')
      return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading bookings.</div>;
  const orders = data || [];
  function toDate(o: any) {
    return parseBookingDateTime(o.booking_date, o.booking_time)
  }
  const now = new Date()
  const upcoming = orders.filter((o: any) => (o.status === 'pending' || o.status === 'confirmed') && toDate(o) >= now).sort((a: any, b: any) => toDate(a).getTime() - toDate(b).getTime())
  const previous = orders.filter((o: any) => !(o.status === 'pending' || o.status === 'confirmed') || toDate(o) < now).sort((a: any, b: any) => toDate(b).getTime() - toDate(a).getTime())

  return (
    <>
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
          {(!upcoming || upcoming.length === 0) ? (
            <div className="bg-muted rounded-xl shadow p-8 min-h-[180px] flex items-center justify-center">
              <span className="text-lg text-muted-foreground">No upcoming bookings.</span>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming ({upcoming.length})</h2>
              </div>
              {upcoming.map((upcomingOrder: any, idx: number) => (
                <section key={idx} className="bg-muted rounded-xl shadow p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <span className="inline-block bg-[#7B61FF] text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">Upcoming</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{formatDate(upcomingOrder.booking_date)}</h2>
                    <div className="text-muted-foreground text-sm mb-2 capitalize">{upcomingOrder.service?.category?.name || ''}</div>
                    <div className="text-lg font-medium mb-1 capitalize">{upcomingOrder.service_title}</div>
                    <div className="text-muted-foreground text-sm mb-4 capitalize">{upcomingOrder.customer?.first_name} {upcomingOrder.customer?.last_name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-4 min-w-[180px] mt-4 md:mt-0">
                    <div className="text-base font-semibold text-right">{parseBookingDateTime(upcomingOrder.booking_date, upcomingOrder.booking_time || '00:00:00').toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                    <div className="flex gap-2 bottom-4">
                      <Button variant="ghost" className="border border-input bg-background hover:bg-muted capitalize">Cancel</Button>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          if (upcomingOrder?.service?.slug && upcomingOrder?.id) {
                            window.location.href = `/services/${upcomingOrder.service.slug}?reschedule=${upcomingOrder.id}`;
                          }
                        }}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" /> Reschedule
                      </Button>
                    </div>
                  </div>
                </section>
              ))}
            </>
          )}
        </section>
      ) : (
        <section className="max-w-3xl mx-auto bg-muted rounded-xl shadow p-8 min-h-[180px]">
          {(!previous || previous.length === 0) ? (
            <div className="flex items-center justify-center min-h-[180px]">
              <span className="text-lg text-muted-foreground">You have no previous bookings.</span>
            </div>
          ) : (
            previous.map((booking: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl shadow p-6 flex items-center gap-6 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{formatDate(booking.booking_date)}</h3>
                  <div className="text-muted-foreground text-sm">{booking.service_title}</div>
                  <div className="text-muted-foreground text-sm">{booking.customer?.first_name} {booking.customer?.last_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{parseBookingDateTime(booking.booking_date, booking.booking_time || '00:00:00').toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="text-sm text-muted-foreground">{booking.status}</div>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </>
  )
}
