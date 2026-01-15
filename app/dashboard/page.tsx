import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HeroSection } from "@/components/dashboard/hero-section"
import { CategoryServices } from "@/components/dashboard/category-services"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategoriesWithActiveServices } from "@/lib/supabase/queries"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If a logged-in admin visits the dashboard, send them to the admin area.
  let profile = null
  if (user) {
    // Fetch profile and categories in parallel; profile is needed for redirect
    const profilePromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
    const categoriesPromise = getCategoriesWithActiveServices()

    const [profileRes, categories] = await Promise.all([profilePromise, categoriesPromise])
    profile = profileRes.data || null
    if (profile?.role === "admin") {
      redirect("/admin")
    }

    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">

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
            <CategoryServices categories={categories} />
          </Suspense>

        </main>

      </div>
    )
  }

  // If no user, just load categories
  const categories = await getCategoriesWithActiveServices()

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

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
          <CategoryServices categories={categories} />
        </Suspense>

        {/* Services Gallery is rendered inside CategoryServices; avoid duplicate rendering here */}

        {/* <Suspense
          fallback={
            <div className="bg-background py-16">
              <div className="container">
                <Skeleton className="h-10 w-64 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-96" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <PopularServices />
        </Suspense> */}

        {/* New: Clinic Vision Section */}
        {/* <ClinicVisionSection /> */}

        {/* New: Modern Services Grid */}
        {/* <ServicesGridSection /> */}

        {/* New: Why Choose Us Section */}
        {/* <WhyChooseUsSection /> */}

        {/* <Suspense
          fallback={
            <div className="bg-muted py-16">
              <div className="container">
                <Skeleton className="h-10 w-64 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <ReviewsSection />
        </Suspense> */}
      </main>

      {/* <Footer /> */}
    </div>
  )
}

