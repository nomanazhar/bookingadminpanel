"use client";
import { useState } from "react";
import SearchBookingSlots from "@/components/admin/search-booking-slots";
import SearchBookingResults from "@/components/admin/search-booking-results";

interface Doctor {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface SearchBookingClientSectionProps {
  initialDoctors: Doctor[];
  initialServices: Service[];
}

export default function SearchBookingClientSection({ initialDoctors, initialServices }: SearchBookingClientSectionProps) {
  const [doctors] = useState<Doctor[]>(initialDoctors);
  const [services] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (params: {
    from?: string;
    to?: string;
    doctorIds?: string[];
    startTime?: string;
    endTime?: string;
    serviceId?: string;
  }) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      // Determine date range
      const fromDate = params.from || params.to || new Date().toISOString().slice(0, 10);
      const toDate = params.to || params.from || fromDate;
      const doctorIds = params.doctorIds && params.doctorIds.length > 0 ? params.doctorIds : doctors.map(d => d.id);
      // Build date list
      const dateList: string[] = [];
      let d = new Date(fromDate);
      const end = new Date(toDate);
      while (d <= end) {
        dateList.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
      // For each date and doctor, fetch available slots
      const allResults: any[] = [];
      for (const date of dateList) {
        const bookings: any[] = [];
        for (const doctorId of doctorIds) {
          if (!params.serviceId) continue;
          // Call API for each doctor/date/service
          const res = await fetch(`/api/available-timeslots?date=${date}&doctorId=${doctorId}&serviceId=${params.serviceId}`);
          const data = await res.json();
          if (data && Array.isArray(data.slots) && data.slots.length > 0) {
            // Filter by time range if provided
            let times = data.slots;
            if (params.startTime && params.endTime) {
              // Convert slot labels to minutes for comparison
              const toMinutes = (label: string) => {
                const [time, ampm] = label.split(" ");
                let [h, m] = time.split(":").map(Number);
                if (ampm === "pm" && h !== 12) h += 12;
                if (ampm === "am" && h === 12) h = 0;
                return h * 60 + m;
              };
              const startMin = toMinutes(params.startTime);
              const endMin = toMinutes(params.endTime);
              times = times.filter((t: string) => {
                const min = toMinutes(t);
                return min >= startMin && min <= endMin;
              });
            } else if (params.startTime) {
              times = times.filter((t: string) => t === params.startTime);
            } else if (params.endTime) {
              times = times.filter((t: string) => t === params.endTime);
            }
            if (times.length > 0) {
              const doctor = doctors.find(d => d.id === doctorId);
              bookings.push({
                label: `${doctor ? doctor.name : 'Doctor'} Available`,
                times,
                onCreate: () => alert(`Create booking for ${doctor ? doctor.name : doctorId} on ${date} at ${times.join(', ')}`)
              });
            }
          }
        }
        if (bookings.length > 0) {
          allResults.push({ date, bookings });
        }
      }
      setResults(allResults);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SearchBookingSlots doctors={doctors} services={services} onSearch={handleSearch} loading={loading} />
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {results && <SearchBookingResults results={results} />}
    </div>
  );
}
