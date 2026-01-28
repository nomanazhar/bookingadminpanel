
"use client";
import { Suspense } from "react";
import { HeroSection } from "../../components/dashboard/hero-section";
import { CategoryServices } from "../../components/dashboard/category-services";
import { Skeleton } from "../../components/ui/skeleton";
import LocationSelectModal from "../../components/dashboard/LocationSelectModal";
import { LocationProvider } from "../../components/providers/location-provider";

export default function DashboardPage() {
  return (
    <LocationProvider>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <LocationSelectModal />
        <main className="flex-1 w-full overflow-x-hidden">
          <HeroSection />
          <Suspense
            fallback={
              <div className="container py-8">
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-40" />
                  ))}
                </div>
              </div>
            }
          >
            <CategoryServices />
          </Suspense>
        </main>
      </div>
    </LocationProvider>
  );
}

