"use client";
import { Suspense, useEffect } from "react";
// import { useLocationContext } from "@/components/providers";
import { HeroSection } from "./hero-section";
import { CategoryServices } from "./category-services";
import { Skeleton } from "../ui/skeleton";

import type { Category } from "@/types"

interface DashboardContentProps {
  categories: Category[]
}

export default function DashboardContent({ categories }: DashboardContentProps) {
  // Location context removed due to missing provider
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* LocationPopup is handled by LocationProvider globally */}
      <main className="flex-1 w-full overflow-x-hidden">
        <HeroSection />
        {/* Category Buttons directly under hero text */}
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
          {categories && (
            <CategoryServices categories={categories} />
          )}
        </Suspense>
      </main>
    </div>
  );
}