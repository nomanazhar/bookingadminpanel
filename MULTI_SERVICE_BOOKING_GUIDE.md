# Multi-Service Booking Implementation Guide

## Overview
Admin and doctors can now punch **multiple treatments/services in ONE booking** for a single patient. This is a complete implementation that's **fully backwards compatible** with existing single-service bookings.

## What Changed?

### 📊 Database Changes
- Orders table now has `service_ids UUID[]` to store multiple service IDs
- Orders table now has `service_titles TEXT[]` to store multiple service names  
- Sessions table now has `service_id` to track which service each session belongs to
- All existing orders remain compatible (via `service_id` field)

### 🎨 Admin Booking Form (Booking Page)
**Before:** Single dropdown to select ONE service
**After:** Multi-select checkboxes to select ONE OR MORE services

**Features:**
- ✅ Click checkboxes to select multiple treatments
- ✅ Shows service name, price, and duration
- ✅ Shows "X services selected" count
- ✅ Pricing automatically aggregates (Service A + Service B = combined total)
- ✅ Duration correctly calculated (for doctor availability checking)

### 💰 Pricing Logic
When multiple services are selected:
- **Unit Price** = Sum of all service prices
- **Discount** = Highest discount percentage (if any service has package discounts)
- **Total Amount** = (Sum of all prices) - (Discount percentage applied)

**Example:**
- Service A: £100 (2 sessions, 10% discount for 2+ sessions = £90)
- Service B: £80 (2 sessions, 15% discount for 2+ sessions = £68)
- **Total = £90 + £68 = £158**

### 🔄 Session Generation
- Each session in the database now links to the specific service (`service_id`)
- This allows tracking: "Session 1 was for Service A, Session 2 was for Service B"
- Admin can see which sessions belong to which treatment

### 📋 API Changes
The booking creation API (`POST /api/admin/orders`) now accepts:

**NEW (Recommended):**
```json
{
  "service_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "sessions": 2,
  ...
}
```

**LEGACY (Still Supported):**
```json
{
  "service_id": "uuid-1",
  "sessions": 2,
  ...
}
```

Both methods work - existing integrations won't break!

## How to Use

### Step 1: Open Create Booking
Navigate to: Admin → Orders → Create New Booking

### Step 2: Select Multiple Services
In the "Service Details" section, **check multiple services** instead of selecting just one:
- ☑️ Facial Treatment
- ☑️ Microdermabrasion  
- ☑️ Chemical Peel

### Step 3: View Aggregated Pricing
The "Total Amount" will automatically calculate:
- Shows all selected service names
- Shows combined total price
- Applies any available discounts

### Step 4: Select Date, Time & Doctor
- **Doctor Availability:** System checks against TOTAL duration of all services
  - If Facial = 50min + Microdermabrasion = 30min = 80 min total
  - Doctor won't be double-booked during that 80-minute window
  
### Step 5: Create Booking
Submit the form - order is created with all services!

## For Existing Orders

**Good News:** Your existing system requires NO changes!
- Single-service bookings continue to work exactly as before
- Sessions still work normally
- Reports and queries are compatible
- Data migration is automatic (backward compatibility)

## Technical Summary

### What's Backwards compatible?
- ✅ Existing orders with single services work unchanged
- ✅ Sessions table queries work (service_id is optional)
- ✅ RLS policies unchanged
- ✅ API still accepts old `service_id` parameter
- ✅ All existing reports and views work

### What's New?
- 🆕 `service_ids[]` column stores multiple service IDs
- 🆕 `service_titles[]` column stores multiple service names
- 🆕 `sessions.service_id` tracks which service each session is for
- 🆕 Multi-select UI in booking form
- 🆕 Aggregate pricing calculation
- 🆕 Total duration calculation for availability checking

## Implementation Quality

### Minimal Code Changes
- **Database:** Added 3 columns (non-breaking additions)
- **Backend:** Enhanced pricing logic + bulk service fetching
- **Frontend:** Replaced single-select with multi-select UI
- **Compatibility:** 100% - no breaking changes

### Zero Data Loss
- Existing `service_id` remains populated for backwards compatibility
- `service_ids[]` automatically migrated during schema update
- All existing orders continue to function

## Examples

### Example 1: Single Service (Legacy)
```
Service: Facial Treatment
Sessions: 3
Price: £150
# Works exactly as before
```

### Example 2: Multiple Services (New)
```
Services:
- Facial Treatment: £100
- Chemical Peel: £80
- Moisturizing Mask: £30

Sessions: 2
Total: (100 + 80 + 30) × 2 = £420
# All services get 2 sessions, combined price
```

### Example 3: With Doctor Availability
```
Doctor: Dr. Sarah (busy 2pm-3pm)
Booking: 1:30pm

Services:
- Consultation: 15 min
- Facial: 45 min  
- Peel: 20 min
Total Duration: 80 minutes

Booking: 1:30pm - 3:00pm
❌ Conflicts with Dr. Sarah's 2pm appointment
✅ Can book different doctor or time
```

## Migration Steps (Already Done)

The SQL file (`SUPABASE_CONSOLIDATED.sql`) includes automatic migration:
```sql
-- Migrate existing orders: populate service_ids from service_id
UPDATE public.orders
SET service_ids = CASE 
    WHEN service_id IS NOT NULL THEN ARRAY[service_id]
    ELSE '{}'
END
WHERE (service_ids IS NULL OR service_ids = '{}') 
  AND service_id IS NOT NULL;
```

## Troubleshooting

### Q: Can I edit existing orders to add more services?
A: The order edit functionality would need updating to support multi-service selection. Currently only new bookings support it.

### Q: What if I only want single services?
A: Just select one service - works exactly the same as before!

### Q: How do I see which sessions belong to which service?
A: Each session now has a `service_id` field. Query sessions by `service_id` to see which belong to each treatment.

### Q: Do reports need updating?
A: Not necessarily - `service_titles[]` shows all services, and legacy `service_id` still works. But you may want to enhance reports to show multi-service breakdowns.

## Files Modified

1. **SUPABASE_CONSOLIDATED.sql**
   - Added `service_ids UUID[]` to orders
   - Added `service_titles TEXT[]` to orders
   - Added `service_id` to sessions with FK
   - Added migration query

2. **types/database.ts**
   - Updated Order interface with `service_ids[]` and `service_titles[]`
   - Updated Session interface with optional `service_id`

3. **app/api/admin/orders/route.ts**
   - Accept `service_ids` (array) or `service_id` (single)
   - Bulk fetch multiple services
   - Calculate aggregate pricing
   - Calculate total duration for availability

4. **app/(admin)/orders/new/page.tsx**
   - Changed state to `selectedServiceIds[]`
   - Replaced single Select with multi-select checkboxes
   - Updated pricing calculation (aggregation)
   - Updated form submission (send service_ids array)
   - Updated all dependent effects and validations

## Performance Notes

✅ Still efficient:
- Single database read for all services
- No N+1 queries or loops
- Pricing calculated in-memory
- Duration aggregation is O(n) where n = number of services

✅ Safe:
- Transactions maintained
- No orphaned data
- Timestamps automatic
- RLS policies still enforce security
