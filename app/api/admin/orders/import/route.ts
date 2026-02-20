import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import * as XLSX from "xlsx";

/**
 * Bulk import bookings from Excel (admin only)
 * Expects: { rows: [ ... ] }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    // Check admin
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    // Get fileKey from request
    const body = await req.json();
    const fileKey = body.fileKey;
    if (!fileKey) {
      return NextResponse.json({ error: "No fileKey provided" }, { status: 400 });
    }
    // Download file from Supabase Storage
    const serviceRole = createServiceRoleClient();
    const { data: fileData, error: fileError } = await serviceRole.storage
      .from("import-uploads")
      .download(fileKey);
    if (fileError || !fileData) {
      return NextResponse.json({ error: fileError?.message || "Failed to download file from storage" }, { status: 500 });
    }
    // Read file as ArrayBuffer and parse Excel
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows found in Excel file" }, { status: 400 });
    }
    // For reporting skipped rows
    const skipped: any[] = [];
    const mapped: any[] = [];
    for (const _row of rows) {
      const row = _row as Record<string, any>;
      // Try to match customer by email, but allow null for legacy
      let customerId: string | null = null;
      if (row["Email"]) {
        const { data: customer } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row["Email"])
          .maybeSingle();
        if (customer) {
          customerId = customer.id;
        }
      }
      // Parse and format date (YYYY-MM-DD)
      let booking_date = row["Date"] || null;
      if (booking_date && typeof booking_date === 'string') {
        const d = booking_date.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (d) booking_date = `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
      }
      // Parse/format time (HH:mm)
      const padTime = (t: string | undefined) => {
        if (!t) return '';
        const parts = String(t).split(":");
        return parts.length === 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00` : t;
      };
      const booking_time = padTime(row["Start Time"]);
      const booking_end_time = padTime(row["End Time"]);
      // Customer type normalization
      let customer_type = (row["Customer Type"] || '').toLowerCase();
      customer_type = customer_type.includes('return') ? 'returning' : 'new';
      // Compose customer name
      const customer_name = `${row["First Name"] || ''} ${row["Last Name"] || ''}`.trim();
      // Set defaults for required fields
      const session_count = 1;
      const unit_price = 0;
      const discount_percent = 0;
      const total_amount = 0;
      // Normalize status to lowercase for enum compatibility
      let status = 'completed';
      if (row["Status"]) {
        status = String(row["Status"]).toLowerCase();
      }
      // Check for duplicate: same customer_email, booking_date, booking_time
      let isDuplicate = false;
      if (row["Email"] && booking_date && booking_time) {
        // Check in orders
        const { data: existingOrder } = await serviceRole
          .from('orders')
          .select('id')
          .eq('customer_email', row["Email"])
          .eq('booking_date', booking_date)
          .eq('booking_time', booking_time)
          .maybeSingle();
        // Check in legacy_orders
        const { data: existingLegacy } = await serviceRole
          .from('legacy_orders')
          .select('id')
          .eq('customer_email', row["Email"])
          .eq('booking_date', booking_date)
          .eq('booking_time', booking_time)
          .maybeSingle();
        if (existingOrder || existingLegacy) {
          isDuplicate = true;
        }
      }
      if (isDuplicate) {
        skipped.push({ row, reason: 'Duplicate entry (same customer, date, and time)' });
        continue;
      }
      // If required fields are missing, insert into legacy_orders
      const isLegacy = !customerId || !row["Treatment"] || !row["Email"] || !['pending','confirmed','completed','cancelled','expired'].includes(status);
      const orderObj = {
        customer_id: customerId,
        customer_name,
        customer_email: row["Email"] || null,
        customer_phone: row["Telephone No"] || null,
        service_title: row["Treatment"] || null,
        booking_date,
        booking_time,
        booking_end_time,
        customer_type,
        session_count,
        unit_price,
        discount_percent,
        total_amount,
        status,
      };
      if (isLegacy) {
        // Insert into legacy_orders
        await serviceRole.from('legacy_orders').insert([orderObj]);
      } else {
        mapped.push(orderObj);
      }
    }
    if (mapped.length > 0) {
      const { error } = await serviceRole.from('orders').insert(mapped);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, imported: mapped.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
