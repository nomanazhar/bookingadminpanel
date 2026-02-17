
import SearchBookingClientSection from "./_client-search-booking-section";

export default async function SearchBookingPage() {
  let doctors: { id: string; name: string }[] = [];
  let services: { id: string; name: string }[] = [];
  try {
    const [docRes, svcRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/doctors`, { cache: "no-store" }),
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/services`, { cache: "no-store" })
    ]);
    if (docRes.ok) {
      const data = await docRes.json();
      if (Array.isArray(data)) {
        doctors = data.filter((d: any) => d.is_active).map((d: any) => ({
          id: d.id,
          name: d.name || ((d.first_name || "") + (d.last_name ? " " + d.last_name : "")).trim() || d.email || "Unknown"
        }));
      }
    }
    if (svcRes.ok) {
      const data = await svcRes.json();
      if (Array.isArray(data)) {
        services = data.filter((s: any) => s.is_active).map((s: any) => ({
          id: s.id,
          name: s.name
        }));
      }
    }
  } catch (e) {
    doctors = [];
    services = [];
  }
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Search Bookings Slots</h1>
        <p className="text-muted-foreground">Find available slots for walk-in or instant bookings</p>
      </div>
      <SearchBookingClientSection initialDoctors={doctors} initialServices={services} />
    </div>
  );
}
