
import SearchBookingClientSection from "./_client-search-booking-section";
import Link from "next/dist/client/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-start gap-4">
         <Link href="/admin-dashboard">
                  <Button variant="primary" size="icon" className="h-6 w-10 ">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
        <h1 className="text-xl font-bold font-heading ">Search Bookings Slots</h1>
        <p className="text-muted-foreground">Find available slots for walk-in or instant bookings</p>
      </div>
      <SearchBookingClientSection initialDoctors={doctors} initialServices={services} />
    </div>
  );
}
