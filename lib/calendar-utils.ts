// Utilities for calendar view

export function generateTimeSlots(startHour = 9, endHour = 18, intervalMins = 30) {
  const slots: string[] = [];
  for (let mins = startHour * 60; mins < endHour * 60; mins += intervalMins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export function formatTime12h(time24: string) {
  const [hh, mm] = time24.split(":").map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function toMinutes(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

export function orderOverlapsSlot(order: any, slotStart: string, slotLengthMins = 30) {
  if (!order) return false;
  const start = order.booking_time ? order.booking_time.slice(0,5) : null;
  // booking_end_time may be null; assume 50 mins fallback
  const end = order.booking_end_time ? order.booking_end_time.slice(0,5) : null;
  if (!start) return false;
  const orderStart = toMinutes(start);
  const orderEnd = end ? toMinutes(end) : (orderStart + (order.duration_minutes || 50));

  const slotS = toMinutes(slotStart);
  const slotE = slotS + slotLengthMins;

  // overlap if start < slotE and end > slotS
  return orderStart < slotE && orderEnd > slotS;
}

// Deterministic color generator for service IDs or titles
function hashStringToInt(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function getServiceColor(key?: string, saturation = 65, lightness = 80) {
  if (!key) return `hsl(220deg ${saturation}% ${lightness}%)`;
  const h = hashStringToInt(key) % 360;
  // Use space-separated HSL for modern browsers; ensure percent units
  return `hsl(${h} ${saturation}% ${lightness}%)`;
}
