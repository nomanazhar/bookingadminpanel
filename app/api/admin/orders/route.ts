import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOrdersPaginated } from "@/lib/supabase/queries"

/**
 * Admin API endpoint to get all bookings
 * Returns all orders for admins with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Get pagination params
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10) || 20

    // Fetch paginated orders from main table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('booking_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Fetch paginated legacy orders
    const { data: legacyOrders, error: legacyError } = await supabase
      .from('legacy_orders')
      .select('*')
      .order('booking_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (ordersError || legacyError) {
      return NextResponse.json({ error: ordersError?.message || legacyError?.message || 'Unknown error' }, { status: 500 });
    }

    // Combine and sort both tables
    const combined = [...(orders || []), ...(legacyOrders || [])].sort((a, b) => {
      // Sort by booking_date desc, fallback to created_at
      const dateA = a.booking_date || a.created_at;
      const dateB = b.booking_date || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return NextResponse.json(combined, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

/**
 * Admin API endpoint to create bookings with customer details
 * Allows admins to create bookings for any customer
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Get customer details from body
    const customerEmail = body.customer_email
    const customerName = body.customer_name
    const customerPhone = body.customer_phone || null
    const customerId = body.customer_id || null
    const doctorId = body.doctor_id || null
    const customerType = body.customer_type === 'returning' ? 'returning' : 'new';

    if (!customerEmail || !customerName) {
      return NextResponse.json({ error: "Customer email and name are required" }, { status: 400 })
    }

    // Find customer profile
    let targetCustomerId: string | null = customerId

    if (!targetCustomerId) {
      // Try to find existing customer by email
      const { data: existingCustomer } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('email', customerEmail)
        .maybeSingle()

      if (existingCustomer) {
        targetCustomerId = existingCustomer.id
        // DO NOT update the profile's name/email. Only use as snapshot for the order.
      } else {
        // Customer not found - return error asking admin to provide customer_id or ensure customer exists
        return NextResponse.json({ 
          error: `Customer with email "${customerEmail}" not found. Please provide an existing customer_id or ensure the customer account exists first.` 
        }, { status: 404 })
      }
    } else {
      // Verify customer exists
      const { data: customerExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', targetCustomerId)
        .maybeSingle()

      if (!customerExists) {
        return NextResponse.json({ 
          error: `Customer with ID "${targetCustomerId}" not found.` 
        }, { status: 404 })
      }
    }

    // Validate service
    const serviceId = body.service_id
    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    // Fetch service details
    const { data: service } = await supabase
      .from('services')
      .select('base_price, name')
      .eq('id', serviceId)
      .single()

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const serviceTitle = body.service_title || service.name || ''
    
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

    // Calculate pricing
    const suppliedUnitPrice = body.unit_price !== undefined ? Number(body.unit_price) : undefined
    const suppliedDiscountPercent = body.discount_percent !== undefined ? Number(body.discount_percent) : 0

    const basePriceNum = Number(service.base_price ?? 0)
    
    // Calculate discount based on package if not provided
    let discountPercent = suppliedDiscountPercent
    if (!suppliedDiscountPercent && sessionCount > 1) {
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
      : Math.round((basePriceNum * (1 - discountPercent / 100)) * 100) / 100

    const totalAmount = body.total_amount !== undefined 
      ? Number(body.total_amount) 
      : Number(unitPrice) * sessionCount

    // Parse booking date and time
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
      if (typeof raw === 'string') {
        const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/)
        if (isoMatch) return raw
      }
      if (raw instanceof Date) {
        return toLocalISO(raw)
      }
      let str = String(raw)
      str = str.replace(/^\w{3},\s*/,'')
      str = normalizeOrdinal(str)
      const parsed = new Date(str)
      if (isNaN(parsed.getTime())) return null
      return toLocalISO(parsed)
    }

    function parseBookingTime(raw: any) {
      if (!raw) return null
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
      const isoMatch = s.match(/(\d{1,2}):(\d{2})/)
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

    // Fetch service duration for overlap check
    const { data: serviceDetails } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    const durationMinutes = serviceDetails?.duration_minutes || 0;
    // Calculate booking end time
    let booking_end_time = null;
    if (durationMinutes && bookingTime) {
      const [h, m, s] = bookingTime.split(":").map(Number);
      const start = new Date(`${bookingDate}T${bookingTime}`);
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + durationMinutes * 60000);
        booking_end_time = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}:${end.getSeconds().toString().padStart(2, "0")}`;
      }
    }

    // Overlap check: find bookings for the same doctor, same date, overlapping time
    if (doctorId && booking_end_time) {
      const { data: overlapping } = await supabase
        .from('orders')
        .select('id, booking_time, booking_end_time')
        .eq('doctor_id', doctorId)
        .eq('booking_date', bookingDate)
        .in('status', ['pending', 'confirmed'])
        .neq('id', null); // Defensive: skip null ids

      const toMinutes = (t: string | null) => {
        if (!t) return 0;
        const [h, m, s] = t.split(":").map(Number);
        return h * 60 + m + (s ? s / 60 : 0);
      };
      const newStart = toMinutes(bookingTime);
      const newEnd = toMinutes(booking_end_time);
      const hasOverlap = (overlapping || []).some((b) => {
        const existStart = toMinutes(b.booking_time);
        const existEnd = toMinutes(b.booking_end_time);
        // Overlap if start < existEnd and end > existStart
        return newStart < existEnd && newEnd > existStart;
      });
      if (hasOverlap) {
        return NextResponse.json({ error: 'Doctor already has a booking in this time slot.' }, { status: 409 });
      }
    }

    // Create the order
    const insertObj = {
      customer_id: targetCustomerId,
      service_id: serviceId,
      doctor_id: doctorId || null,
      service_title: serviceTitle,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      address: body.address || null,
      session_count: sessionCount,
      unit_price: unitPrice,
      discount_percent: Math.round(discountPercent),
      total_amount: totalAmount,
      booking_date: bookingDate,
      booking_time: bookingTime,
      booking_end_time,
      notes: body.notes || null,
      status: 'pending', // Default to pending
      customer_type: customerType,
    }

    const { data: inserted, error } = await supabase
      .from('orders')
      .insert([insertObj])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

