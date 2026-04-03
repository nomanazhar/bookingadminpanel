
import { getCategories } from "@/lib/supabase/queries"
import ClientServicesSection from "./_client-services-section"

export default async function ServicesPage() {
  const categories = await getCategories()
  return (
    <div className="p-6 space-y-2">
      <div className="flex items-center justify-start gap-6">
        <h1 className="text-xl font-bold font-heading ">Treatments</h1>
        <p className="text-muted-foreground">Manage your treatments</p>
      </div>
      <ClientServicesSection categories={categories} />
    </div>
  )
}

