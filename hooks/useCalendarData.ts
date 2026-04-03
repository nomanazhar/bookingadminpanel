import { useEffect, useState } from "react";
import type { Doctor, Order } from "@/types";
import { generateTimeSlots } from "@/lib/calendar-utils";

export function useCalendarData(selectedDate: string, filteredDoctorIds: string[] = []) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ordersByDoctor, setOrdersByDoctor] = useState<Record<string, Order[]>>({});
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        // Prepare doctors fetch and compact bookings fetch (pass abort signal)
        const docsPromise = fetch('/api/doctors', { signal: controller.signal });

        // build doctors param for bookings endpoint
        const doctorsParam = (filteredDoctorIds || []).length > 0 ? `&doctors=${filteredDoctorIds.join(',')}` : '';
        const bookingsUrl = `/api/admin/bookings-by-date?date=${encodeURIComponent(selectedDate)}${doctorsParam}&limit=100`;
        const bookingsPromise = fetch(bookingsUrl, { signal: controller.signal });

        const [docsRes, bookingsRes] = await Promise.all([docsPromise, bookingsPromise]);

        let docs: Doctor[] = [];
        if (docsRes.ok) docs = await docsRes.json();

        let bookingsData: any = { bookings: [] };
        if (bookingsRes.ok) bookingsData = await bookingsRes.json();

        const bookings: Order[] = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [];

        // group by doctor_id
        const grouped: Record<string, Order[]> = {};
        bookings.forEach(o => {
          const key = o.doctor_id || 'unassigned';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(o as Order);
        });

        if (!ignore) {
          setDoctors(docs || []);
          setOrdersByDoctor(grouped);
          setTimeSlots(generateTimeSlots(9, 18, 30));
        }
      } catch (err: any) {
        // Ignore abort errors silently
        if (err?.name === 'AbortError') return;
        console.error('Calendar data load error', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedDate, filteredDoctorIds]);

  return { doctors, ordersByDoctor, timeSlots, loading } as const;
}