import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceRoleClient'
import { createCalendarEvent } from '@/lib/google/calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderId,           // existing order ID from your DB
      serviceTitle,
      customerName,
      customerEmail,
      doctorEmail,
      bookingDate,       // "YYYY-MM-DD"
      bookingTime,       // "HH:MM:SS"
      bookingEndTime,    // "HH:MM:SS" or null
      location,
      notes,
    } = body

    if (!orderId || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the Google Calendar event
    const { eventId, eventLink } = await createCalendarEvent({
      title:         `${serviceTitle} — ${customerName}`,
      description:   [
        `Customer: ${customerName}`,
        `Email: ${customerEmail}`,
        notes ? `Notes: ${notes}` : '',
      ].filter(Boolean).join('\n'),
      date:          bookingDate,
      startTime:     bookingTime,
      endTime:       bookingEndTime ?? undefined,
      customerEmail: customerEmail ?? undefined,
      doctorEmail:   doctorEmail   ?? undefined,
      location:      location      ?? undefined,
    })

    // Save the event ID back to the order so we can update/cancel it later
    const supabase = createServiceRoleClient()
    const { error: updateError } = await supabase
      .from('orders')
      .update({ google_calendar_event_id: eventId })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to save calendar event ID to order:', updateError)
      // Non-fatal — event was created, just not linked
    }

    return NextResponse.json({ success: true, eventId, eventLink })
  } catch (error: any) {
    console.error('Calendar event creation failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}