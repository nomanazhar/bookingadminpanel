
import { getCategories } from "@/lib/supabase/queries"
import ClientServicesSection from "./_client-services-section"

export default async function ServicesPage() {
  const categories = await getCategories()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Treatments</h1>
        <p className="text-muted-foreground">Manage your treatments</p>
      </div>
      <ClientServicesSection categories={categories} />
    </div>
  )
}

