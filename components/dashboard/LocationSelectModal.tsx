"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLocation } from "../providers/location-provider"
import { LOCATIONS } from "../providers/locations"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


export default function LocationSelectModal() {

  const [open, setOpen] = useState(false);
  const { location, setLocation } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const locationSelectedOnce = localStorage.getItem("locationSelectedOnce");
      if (!location && !locationSelectedOnce) {
        // Force logout before showing location popup
        const supabase = createClient();
        supabase.auth.signOut().finally(() => {
          setOpen(true);
        });
      }
    }
  }, [location]);

  const handleSelect = (loc: string | null) => {
    setLocation(loc);
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("locationSelectedOnce", "true");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Update your location?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-muted-foreground text-center">Select your preferred region below.</div>
          <div className="flex flex-col gap-4">
            {LOCATIONS.map((loc) => (
              <Button key={loc} variant="outline" className="rounded-full py-6 text-base font-semibold" onClick={() => handleSelect(loc)}>
                {loc}
              </Button>
            ))}
            <Button variant="ghost" className="mt-2" onClick={() => handleSelect(null)}>
              Stay here
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
