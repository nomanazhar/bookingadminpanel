import React from "react";

interface SlotResult {
  date: string;
  bookings: Array<{
    label: string;
    times: string[]; // available slots for this doctor
    onCreate?: () => void;
  }>;
}

interface SearchBookingResultsProps {
  results: SlotResult[];
}

// Generate all possible slots (15-min intervals from 9:00am to 6:00pm)
function getAllSlots() {
  const slots: string[] = [];
  for (let min = 9 * 60; min <= 18 * 60 - 15; min += 15) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    let hour = h % 12;
    if (hour === 0) hour = 12;
    const ampm = h < 12 ? "am" : "pm";
    const label = `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
    slots.push(label);
  }
  return slots;
}

export default function SearchBookingResults({ results }: SearchBookingResultsProps) {
  if (!results || results.length === 0) return <div className="text-muted-foreground mt-4">No slots found.</div>;
  // Helper to convert slot label to minutes
  function toMinutes(label: string) {
    const [time, ampm] = label.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return h * 60 + m;
  }

  // Determine time filter from results (assume all bookings use same filter)
  let filterStart: number | null = null;
  let filterEnd: number | null = null;
  if (results && results.length > 0 && results[0].bookings && results[0].bookings.length > 0) {
    const allTimes = results[0].bookings.flatMap((b: any) => b.times);
    // If allTimes is a subset of allSlots, infer min/max as filter
    const allSlots = getAllSlots();
    const filtered = allSlots.filter(s => allTimes.includes(s));
    if (filtered.length > 0 && filtered.length < allSlots.length) {
      filterStart = toMinutes(filtered[0]);
      filterEnd = toMinutes(filtered[filtered.length - 1]);
    }
  }
  const allSlots = getAllSlots().filter(slot => {
    if (filterStart !== null && filterEnd !== null) {
      const min = toMinutes(slot);
      return min >= filterStart && min <= filterEnd;
    }
    return true;
  });
  return (
    <div className="space-y-8 mt-6">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 ml-2">
        <span className="inline-flex items-center"><span className="w-4 h-4 bg-green-600 rounded mr-1 inline-block"></span>Available</span>
        <span className="inline-flex items-center"><span className="w-4 h-4 bg-red-500 rounded mr-1 inline-block"></span>Unavailable</span>
      </div>
      {results.map((res, i) => (
        <div key={res.date} className="bg-[#f5f5f5] rounded border overflow-x-auto">
          <div className="text-center font-semibold text-lg py-2 border-b bg-[#e5e5e5]">
            Date: {res.date}
          </div>
          <div className="divide-y">
            {res.bookings.map((b, j) => (
              <div key={j} className="flex items-center gap-4 py-2 px-4 flex-wrap">
                <span className="font-medium text-gray-700 min-w-[140px]">{b.label}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 flex-1">
                  {allSlots.map((slot) => {
                    // Only show slots in the filter range
                    // If slot is in b.times, it's available (green), else unavailable (red)
                    const isAvailable = b.times.includes(slot);
                    return (
                      <span
                        key={slot}
                        className={`px-3 py-1 rounded font-semibold text-white text-sm text-center cursor-pointer select-none ${isAvailable ? 'bg-green-600' : 'bg-red-500'}`}
                      >
                        {slot}
                      </span>
                    );
                  })}
                </div>
                <button
                  className="ml-auto bg-purple-700 hover:bg-purple-800 text-white px-4 py-1 rounded font-semibold text-sm"
                  onClick={b.onCreate}
                  type="button"
                >
                  + Create Booking
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
