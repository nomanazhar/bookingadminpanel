
export const dynamic = "force-static";
import { getCategories } from "@/lib/supabase/queries"
import ClientCategoriesSection from "./_client-categories-section"

export default async function CategoriesPage() {
  const categories = await getCategories()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Categories</h1>
        <p className="text-muted-foreground">Manage service categories</p>
      </div>
      <ClientCategoriesSection initialCategories={categories} />
    </div>
  )
}

