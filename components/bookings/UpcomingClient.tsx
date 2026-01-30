"use client"
import React, { useState } from 'react'
import { parseBookingDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import RescheduleButton from './RescheduleButton'

interface Props {
  booking_date: string
  booking_time?: string | null
  service?: any
  service_title?: string
  customer?: any
  orderId?: string
}

export default function UpcomingClient({ booking_date, booking_time, service, service_title, customer, orderId }: Props) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const dt = parseBookingDateTime(booking_date, booking_time || '00:00:00')
  const dateLabel = dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const timeLabel = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  const handleCancel = async () => {
    if (!orderId) return;
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setCancelled(true);
      } else {
        alert('Failed to cancel booking.');
      }
    } catch {
      alert('Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (cancelled) {
    return (
      <div className="flex items-center justify-center py-8 w-full">
        <span className="text-green-600 font-semibold">Booking cancelled.</span>
      </div>
    );
  }

  return (
    <div className='flex '>
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <span className="inline-block bg-[#7B61FF] text-white text-xs font-semibold px-3 py-1 rounded-full mb-2 capitalize">Upcoming</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">{dateLabel}</h2>
        <div className="text-muted-foreground text-sm mb-2 capitalize">{service?.category?.name || ''}</div>
        <div className="text-lg font-medium mb-1 capitalize">{service_title}</div>
        <div className="text-muted-foreground text-sm mb-4 capitalize">{customer?.first_name} {customer?.last_name}</div>
      </div>
      <div className="flex items-end justify-end flex-col items-end gap-4 min-w-[180px]  md:mt-0">
        <div className="text-base font-semibold text-right">{timeLabel}</div>
        <div className="flex gap-2 bottom-4">
          <Button
            variant="ghost"
            className="capitalize border border-input bg-background hover:bg-red-500"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
          {service?.slug && orderId && (
            <RescheduleButton slug={service.slug} orderId={orderId} />
          )}
        </div>
      </div>
    </div>
  )
}
