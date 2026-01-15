import { getOrders } from '@/lib/supabase/queries';

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // fetch profile for name/email
    const { data: profile } = await supabase.from('profiles').select('first_name,last_name,email').eq('id', user.id).single()

    const serviceId = body.service_id
    const serviceTitle = body.service_title || body.service_name || ''
    
    // Parse session count - prioritize sessions field, then session_count, then package
    let sessionCount = 1
    if (body.sessions !== undefined) {
      sessionCount = typeof body.sessions === 'number' ? body.sessions : parseInt(String(body.sessions), 10) || 1
    } else if (body.session_count !== undefined) {
      sessionCount = typeof body.session_count === 'number' ? body.session_count : parseInt(String(body.session_count), 10) || 1
    } else if (body.package) {
      const pkg = body.package
      sessionCount = typeof pkg === 'number' 
        ? pkg 
        : (pkg.toString().match(/\d+/) 
            ? parseInt(pkg.toString().match(/\d+/)![0], 10) 
            : 1)
    }
    
    // Ensure session count is between 1 and 10
    sessionCount = Math.max(1, Math.min(10, sessionCount))

    // fetch service base price
    const { data: service } = await supabase.from('services').select('base_price').eq('id', serviceId).single()

    // normalize numeric fields from body
    const suppliedUnitPrice = body.unit_price !== undefined ? Number(body.unit_price) : undefined
    const suppliedDiscountPercent = body.discount_percent !== undefined ? Number(body.discount_percent) : undefined

    // compute unit price: prefer supplied unit_price, otherwise derive from service base price and discount
    const basePriceNum = Number(service?.base_price ?? 0)
    
    // Calculate discount based on session count if not provided
    let discountPercent = suppliedDiscountPercent
    if (suppliedDiscountPercent === undefined && sessionCount > 1) {
      switch (sessionCount) {
        case 3:
          discountPercent = 25
          break
        case 6:
          discountPercent = 35
          break
        case 10:
          discountPercent = 45
          break
        default:
          discountPercent = 0
      }
    }
    
    const unitPrice = suppliedUnitPrice !== undefined 
      ? suppliedUnitPrice 
      : Math.round((basePriceNum * (1 - (discountPercent || 0) / 100)) * 100) / 100

    // compute total amount: prefer supplied total_amount, otherwise unitPrice * sessionCount
    const totalAmount = body.total_amount !== undefined ? Number(body.total_amount) : Number(unitPrice) * sessionCount

    // final discount percent (integer)
    discountPercent = Math.round(discountPercent || 0)

    const bookingDateRaw = body.date || body.booking_date
    const bookingTimeRaw = body.time || body.booking_time

    function normalizeOrdinal(s: string) {
      return s.replace(/(\d+)(st|nd|rd|th)/, "$1")
    }

    function toLocalISO(d: Date) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    function parseBookingDate(raw: any) {
      if (!raw) return null
      // If already an ISO YYYY-MM-DD string, return as-is
      if (typeof raw === 'string') {
        const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/)
        if (isoMatch) return raw
      }
      if (raw instanceof Date) {
        const d = raw as Date
        return toLocalISO(d)
      }
      let str = String(raw)
      str = str.replace(/^\w{3},\s*/,'') // remove weekday like "Mon, "
      str = normalizeOrdinal(str)
      const parsed = new Date(str)
      if (isNaN(parsed.getTime())) return null
      return toLocalISO(parsed)
    }

    function parseBookingTime(raw: any) {
      if (!raw) return null
      // Accept formats like "10:00 am", "5:15 pm", "17:00"
      const s = String(raw).trim().toLowerCase()
      const ampmMatch = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
      if (ampmMatch) {
        let hh = parseInt(ampmMatch[1], 10)
        const mm = ampmMatch[2]
        const ap = ampmMatch[3]
        if (ap === 'pm' && hh !== 12) hh += 12
        if (ap === 'am' && hh === 12) hh = 0
        return `${String(hh).padStart(2,'0')}:${mm}:00`
      }
      const isoMatch = s.match(/(\d{1,2}):(\d{2})/) // 24h
      if (isoMatch) {
        return `${String(parseInt(isoMatch[1],10)).padStart(2,'0')}:${isoMatch[2]}:00`
      }
      return null
    }

    const bookingDate = parseBookingDate(bookingDateRaw)
    const bookingTime = parseBookingTime(bookingTimeRaw)

    if (!bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Invalid booking date or time' }, { status: 400 })
    }

    const insertObj = {
      customer_id: user.id,
      service_id: serviceId,
      doctor_id: body.doctor_id || null,
      service_title: serviceTitle,
      customer_name: profile ? `${profile.first_name} ${profile.last_name}` : '',
      customer_email: profile?.email || user.email || '',
      customer_phone: body.customer_phone || null,
      address: body.address || null,
      session_count: sessionCount,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      total_amount: totalAmount,
      booking_date: bookingDate,
      booking_time: bookingTime,
      notes: body.notes || null,
    }

    const { data: inserted, error } = await supabase.from('orders').insert([insertObj]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(inserted, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
